/**
 * Agentic loop using the Anthropic Skills pattern.
 *
 * Progressive disclosure:
 *   L1 — Pre-load every SKILL.md's YAML frontmatter (name + description)
 *        into the system prompt. Cheap metadata, scales to many skills.
 *   L2 — Model picks a skill → calls `load_skill` → full SKILL.md body
 *        is injected as tool_result.
 *   L3 — Model follows skill instructions, calls `read_file` / `run_bash`
 *        to pull referenced scripts or assets only when needed.
 *
 * Layout expected on disk:
 *   skills/
 *     pdf-extract/
 *       SKILL.md
 *       scripts/extract.py
 *     docx-report/
 *       SKILL.md
 *       templates/letter.docx
 *
 * Each SKILL.md starts with YAML frontmatter:
 *   ---
 *   name: pdf-extract
 *   description: Extract text/tables from PDFs. Use when the user mentions PDFs.
 *   ---
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

interface Skill {
  name: string;
  description: string;
  dir: string; // absolute path to the skill directory
  skillMdPath: string;
}

// ──────────────────────────────────────────────────────────────────────
// L1: Skill discovery — read only the frontmatter
// ──────────────────────────────────────────────────────────────────────

function parseFrontmatter(src: string): Record<string, string> | null {
  const m = src.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return null;
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[kv[1]] = v;
  }
  return out;
}

async function discoverSkills(skillsRoot: string): Promise<Skill[]> {
  const entries = await fs.readdir(skillsRoot, { withFileTypes: true });
  const skills: Skill[] = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(skillsRoot, e.name);
    const skillMdPath = path.join(dir, "SKILL.md");
    try {
      const content = await fs.readFile(skillMdPath, "utf-8");
      const fm = parseFrontmatter(content);
      if (!fm?.name || !fm?.description) continue;
      skills.push({
        name: fm.name,
        description: fm.description,
        dir,
        skillMdPath,
      });
    } catch {
      // No SKILL.md in this directory — skip.
    }
  }
  return skills;
}

// ──────────────────────────────────────────────────────────────────────
// Tools exposed to the model
// ──────────────────────────────────────────────────────────────────────

const tools: Tool[] = [
  {
    name: "load_skill",
    description:
      "Load the full SKILL.md content for a skill you've selected from the catalog. " +
      "Call this after you've decided which skill matches the task.",
    input_schema: {
      type: "object",
      properties: {
        skill_name: {
          type: "string",
          description: "Exact `name` from the skill catalog.",
        },
      },
      required: ["skill_name"],
    },
  },
  {
    name: "read_file",
    description:
      "Read a file referenced by a loaded skill (e.g. scripts/foo.py, references/bar.md). " +
      "Paths are resolved relative to the skill's directory.",
    input_schema: {
      type: "object",
      properties: {
        skill_name: { type: "string" },
        relative_path: { type: "string" },
      },
      required: ["skill_name", "relative_path"],
    },
  },
  {
    name: "run_bash",
    description:
      "Execute a bash command to do real work. Returns stdout+stderr.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string" },
      },
      required: ["command"],
    },
  },
];

// ──────────────────────────────────────────────────────────────────────
// Tool dispatcher
// ──────────────────────────────────────────────────────────────────────

async function runTool(
  block: ToolUseBlock,
  skills: Skill[],
): Promise<{ content: string; is_error: boolean }> {
  const input = block.input as Record<string, unknown>;

  try {
    switch (block.name) {
      case "load_skill": {
        const skill = skills.find((s) => s.name === input.skill_name);
        if (!skill) throw new Error(`skill '${input.skill_name}' not found`);
        const body = await fs.readFile(skill.skillMdPath, "utf-8");
        return { content: body, is_error: false };
      }

      case "read_file": {
        const skill = skills.find((s) => s.name === input.skill_name);
        if (!skill) throw new Error(`skill '${input.skill_name}' not found`);
        const rel = String(input.relative_path);
        const abs = path.resolve(skill.dir, rel);
        // Prevent path traversal outside the skill dir.
        if (!abs.startsWith(skill.dir + path.sep) && abs !== skill.dir) {
          throw new Error(`path escapes skill directory: ${rel}`);
        }
        return { content: await fs.readFile(abs, "utf-8"), is_error: false };
      }

      case "run_bash": {
        const { stdout, stderr } = await execFileAsync(
          "bash",
          ["-c", String(input.command)],
          { timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
        );
        return {
          content: `STDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
          is_error: false,
        };
      }

      default:
        throw new Error(`unknown tool: ${block.name}`);
    }
  } catch (err) {
    return {
      content: err instanceof Error ? err.message : String(err),
      is_error: true,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Agentic loop
// ──────────────────────────────────────────────────────────────────────

interface RunOptions {
  task: string;
  skillsRoot: string;
  model?: string;
  maxIterations?: number;
}

async function runAgent(opts: RunOptions): Promise<string> {
  const client = new Anthropic();
  const skills = await discoverSkills(opts.skillsRoot);

  // L1 — only metadata goes into the system prompt.
  const catalog = skills.map((s) => `- ${s.name}: ${s.description}`).join("\n");

  const system = [
    "You are an agent that solves tasks by selecting and applying Skills.",
    "",
    "## Available Skills",
    catalog || "(no skills installed)",
    "",
    "## Workflow",
    "1. Read the task. Pick the skill(s) whose description matches. If none fits, just solve it directly.",
    "2. For each selected skill, call `load_skill` to read its full instructions.",
    "3. Follow the skill's guidance. Use `read_file` for referenced assets, `run_bash` to execute work.",
    "4. When the task is done, reply with a brief summary and stop.",
  ].join("\n");

  const messages: MessageParam[] = [{ role: "user", content: opts.task }];
  const maxIter = opts.maxIterations ?? 20;

  for (let i = 0; i < maxIter; i++) {
    const res = await client.messages.create({
      model: opts.model ?? "claude-sonnet-4-6",
      max_tokens: 4096,
      system,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: res.content });

    if (res.stop_reason === "end_turn") {
      return res.content
        .filter(
          (b): b is Extract<typeof b, { type: "text" }> => b.type === "text",
        )
        .map((b) => b.text)
        .join("\n");
    }

    if (res.stop_reason !== "tool_use") {
      throw new Error(`unexpected stop_reason: ${res.stop_reason}`);
    }

    // Execute every tool_use block in parallel; preserve order in results.
    const toolUses = res.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );
    const results = await Promise.all(toolUses.map((b) => runTool(b, skills)));

    const toolResults: ToolResultBlockParam[] = toolUses.map((b, idx) => ({
      type: "tool_result",
      tool_use_id: b.id,
      content: results[idx].content,
      is_error: results[idx].is_error,
    }));

    messages.push({ role: "user", content: toolResults });
  }

  throw new Error(`agent exceeded ${maxIter} iterations`);
}

// ──────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────

async function main() {
  const out = await runAgent({
    task: "Extract the invoice total from /tmp/invoice.pdf and write it to /tmp/total.txt",
    skillsRoot: path.resolve("./skills"),
  });
  console.log("\n=== FINAL ===\n" + out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
