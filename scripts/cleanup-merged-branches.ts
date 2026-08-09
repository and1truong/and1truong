const args = process.argv.slice(2);

type Options = {
  dryRun: boolean;
  includeLocal: boolean;
  includeRemote: boolean;
  baseBranch: string;
  remote: string;
  force: boolean;
};

function usage() {
  console.log(`Usage: bun scripts/cleanup-merged-branches.ts [options]\n\n` +
    `Options:\n` +
    `  --dry-run               Show what would be removed without deleting\n` +
    `  --local-only            Only delete local branches\n` +
    `  --remote-only           Only delete remote branches\n` +
    `  --force                 Use -D for local branch deletion (force)\n` +
    `  --base <branch>         Base branch for merge check (default: main)\n` +
    `  --remote <name>         Remote name for remote cleanup (default: origin)\n` +
    `  -h, --help             Show this help`);
}

function parseArgs(argv: string[]): { options: Options; invalid: string[] } {
  const opts: Options = {
    dryRun: false,
    includeLocal: true,
    includeRemote: true,
    baseBranch: "main",
    remote: "origin",
    force: false,
  };

  const invalid: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    }
    if (arg === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    if (arg === "--local-only") {
      opts.includeRemote = false;
      continue;
    }
    if (arg === "--remote-only") {
      opts.includeLocal = false;
      continue;
    }
    if (arg === "--force") {
      opts.force = true;
      continue;
    }
    if (arg === "--base") {
      const next = argv[i + 1];
      if (next) {
        opts.baseBranch = next;
        i++;
      } else {
        invalid.push("--base requires a value");
      }
      continue;
    }
    if (arg.startsWith("--base=")) {
      opts.baseBranch = arg.slice("--base=".length);
      continue;
    }
    if (arg === "--remote") {
      const next = argv[i + 1];
      if (next) {
        opts.remote = next;
        i++;
      } else {
        invalid.push("--remote requires a value");
      }
      continue;
    }
    if (arg.startsWith("--remote=")) {
      opts.remote = arg.slice("--remote=".length);
      continue;
    }

    invalid.push(`Unknown arg: ${arg}`);
  }

  if (opts.includeLocal === false && opts.includeRemote === false) {
    invalid.push("Cannot use --local-only and --remote-only together");
  }

  return { options: opts, invalid };
}

async function runGit(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["git", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function ensureRepo() {
  const { code, stdout } = await runGit(["rev-parse", "--is-inside-work-tree"]);
  if (code !== 0 || stdout !== "true") {
    console.error("Not a git repository");
    process.exit(1);
  }
}

async function getCurrentBranch(): Promise<string | null> {
  const { code, stdout } = await runGit(["symbolic-ref", "--short", "HEAD"]);
  return code === 0 ? stdout.trim() : null;
}

async function getMergedLocalBranches(baseBranch: string, currentBranch: string | null): Promise<string[]> {
  const { code, stdout } = await runGit(["branch", "--format=%(refname:short)", "--merged", baseBranch]);
  if (code !== 0) return [];

  return lines(stdout).filter((branch) => branch !== baseBranch && branch !== currentBranch);
}

async function getMergedRemoteBranches(remote: string, baseBranch: string): Promise<string[]> {
  const { code, stdout } = await runGit([
    "for-each-ref",
    "--format=%(refname:short)",
    `refs/remotes/${remote}/`,
    "--merged",
    `${remote}/${baseBranch}`,
  ]);
  if (code !== 0) return [];

  return lines(stdout)
    .map((full) => {
      return full.startsWith(`${remote}/`) ? full.slice(`${remote}/`.length) : full;
    })
    .filter((branch) => branch !== "HEAD" && branch !== baseBranch && branch !== remote)
    .filter((branch, index, array) => array.indexOf(branch) === index);
}

async function getWorktreesByBranch(): Promise<Map<string, string[]>> {
  const { code, stdout } = await runGit(["worktree", "list", "--porcelain"]);
  const map = new Map<string, string[]>();
  if (code !== 0) return map;

  let currentPath: string | null = null;
  for (const line of lines(stdout)) {
    if (line.startsWith("worktree ")) {
      currentPath = line.slice("worktree ".length);
      continue;
    }
    if (line.startsWith("branch ")) {
      const ref = line.slice("branch ".length);
      if (!currentPath) continue;
      if (!ref.startsWith("refs/heads/")) continue;
      const branch = ref.slice("refs/heads/".length);
      const existing = map.get(branch) ?? [];
      existing.push(currentPath);
      map.set(branch, existing);
      continue;
    }
  }

  return map;
}

async function deleteWorktree(path: string, dryRun: boolean) {
  if (dryRun) {
    console.log(`  - (dry-run) remove worktree: ${path}`);
    return;
  }
  const { code, stderr } = await runGit(["worktree", "remove", "--force", path]);
  if (code !== 0) {
    console.error(`  ⚠ failed to remove worktree ${path}: ${stderr}`);
  }
}

async function deleteLocalBranch(branch: string, options: Options, currentRepoRoot: string, worktrees: Map<string, string[]>) {
  const candidates = (worktrees.get(branch) ?? []).filter((path) => path !== currentRepoRoot);

  for (const path of candidates) {
    await deleteWorktree(path, options.dryRun);
  }

  if (options.dryRun) {
    console.log(`  - (dry-run) delete local branch ${branch}`);
    return true;
  }

  const flag = options.force ? "-D" : "-d";
  const { code, stderr } = await runGit(["branch", flag, branch]);
  if (code !== 0) {
    console.error(`  ⚠ failed to delete local branch ${branch}: ${stderr}`);
    return false;
  }

  console.log(`  ✓ removed local branch ${branch}`);
  return true;
}

async function deleteRemoteBranch(branch: string, options: Options) {
  if (options.dryRun) {
    console.log(`  - (dry-run) delete remote branch ${options.remote}/${branch}`);
    return true;
  }

  const { code, stderr } = await runGit(["push", options.remote, "--delete", branch]);
  if (code !== 0) {
    if (stderr.includes("remote ref does not exist")) {
      console.log(`  - remote branch already missing: ${options.remote}/${branch}`);
      return true;
    }

    console.error(`  ⚠ failed to delete remote branch ${options.remote}/${branch}: ${stderr}`);
    return false;
  }

  console.log(`  ✓ removed remote branch ${options.remote}/${branch}`);
  return true;
}

async function main() {
  const { options, invalid } = parseArgs(args);
  if (invalid.length) {
    for (const item of invalid) console.error(`error: ${item}`);
    usage();
    process.exit(1);
  }

  await ensureRepo();

  const currentBranch = await getCurrentBranch();
  const currentRepoRoot = (await runGit(["rev-parse", "--show-toplevel"])).stdout;
  const remoteExists = (await runGit(["remote"]))
    .stdout
    .split(/\s+/)
    .filter(Boolean)
    .includes(options.remote);

  if (options.includeRemote && !remoteExists) {
    console.error(`error: remote "${options.remote}" does not exist`);
    process.exit(1);
  }

  const localBranches = options.includeLocal
    ? await getMergedLocalBranches(options.baseBranch, currentBranch)
    : [];
  const remoteBranches = options.includeRemote
    ? await getMergedRemoteBranches(options.remote, options.baseBranch)
    : [];

  const worktrees = await getWorktreesByBranch();

  console.log(`\nBranches merged into ${options.baseBranch}:`);

  if (options.includeLocal) {
    if (localBranches.length === 0) {
      console.log("  [local] none");
    } else {
      console.log("  [local]");
      let allGood = true;
      for (const branch of localBranches) {
        const ok = await deleteLocalBranch(branch, options, currentRepoRoot, worktrees);
        allGood = allGood && ok;
      }
      if (!allGood) {
        process.exitCode = 1;
      }
    }
  }

  if (options.includeRemote) {
    if (remoteBranches.length === 0) {
      console.log("  [remote] none");
    } else {
      console.log("  [remote]");
      let allGood = true;
      for (const branch of remoteBranches) {
        const ok = await deleteRemoteBranch(branch, options);
        allGood = allGood && ok;
      }
      if (!allGood) process.exitCode = 1;
    }
  }

  if ((options.includeLocal && localBranches.length > 0) || (options.includeRemote && remoteBranches.length > 0)) {
    if (options.dryRun) {
      console.log(`\nDry run complete. No changes applied.`);
    } else {
      console.log(`\nCleanup complete.`);
    }
  } else {
    console.log("\nNothing to clean up.");
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
