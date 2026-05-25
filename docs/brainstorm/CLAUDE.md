# docs/brainstorm — design & planning documents

Self-contained HTML brainstorm/spec documents, one per decision space. Each is
produced by a brainstorming/grilling session and is the durable record of *why*
a call was made. Two human-facing tables of contents split the docs by ship
state: `index.html` lists **on-going** docs (work not yet shipped) and
`index.shipped.html` lists **shipped** docs (work that has landed).

## The index invariant — keep it in sync

**`index.html` and `index.shipped.html` together must list exactly the
`NNN-*.html` docs present in this directory — every doc in exactly one of them,
no missing entries, no orphan entries, no duplicates.** A doc belongs in
`index.shipped.html` once its implementing epic(s) are `done` (see
[`../epics/index.md`](../epics/index.md)); otherwise it lives in `index.html`.
Any change to the set of docs — or to a doc's ship state — is incomplete until
both indexes match, in the *same* change:

- **Add a doc** → add its `<li>` to the `<ol class="docs">` in `index.html`
  (new docs are on-going by default).
- **Rename / renumber a doc** → update its number, title text, and `href` in
  whichever index holds it.
- **Remove a doc** → delete its `<li>` from whichever index holds it.
- **A doc ships** → move its `<li>` from `index.html` to `index.shipped.html`.

Within each index, entries are ordered by number ascending (newest at the
bottom); numbering is a single sequence shared across both files. Neither
`index.html` nor `index.shipped.html` is a numbered doc, and neither appears in
either list.

## Numbering

Sequential, zero-padded three digits (`001`, `002`, …). The next doc takes
`highest existing number + 1`. Never reuse or skip a number. Find the next one:

```
ls docs/brainstorm/[0-9]*.html | sort | tail -1
```

## Render rules (house style & vertical-tab layout)

Every doc links the shared `page.css` + `page.js` and renders its body as
**vertical tabs** (one `.panel` shown at a time) instead of one long scroll.
**Before creating or editing a doc's HTML layout, read
[`CLAUDE.render-rules.md`](CLAUDE.render-rules.md)** for the required structure
(breadcrumb, header, `.layout`/`.tabs`/`.panel`, footer) and the rules.

## New-doc checklist

1. Name the file `NNN-kebab-case-slug.html`.
2. Build it per [`CLAUDE.render-rules.md`](CLAUDE.render-rules.md): link
   `page.css` + `page.js` (never inline styles or the tab script) and lay the
   body out as vertical tabs.
3. Set `<title>` to `Brainstorm NNN — <topic>`, the `.crumbs` breadcrumb, an
   `<h1>`, and a `.meta` line (date + status, e.g. `status: design, awaiting
   review` or `locked`).
4. Add the matching `<li>` to `index.html` (number, title, `href`, one-line
   `.desc`, a `.sub` date line, and a status `.tag`).

## Status tags (in the index)

- `<span class="tag s">locked spec</span>` / `locked plan` — settled, do not relitigate.
- `<span class="tag m">awaiting review</span>` — design done, pending sign-off.

A doc whose status changes (e.g. review → locked) gets its index tag updated too.
