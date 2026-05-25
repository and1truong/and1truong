# Brainstorm doc render rules — house style & vertical-tab layout

How every `docs/brainstorm/NNN-*.html` doc is structured and styled. Read this
when creating a new doc or editing a doc's HTML layout.

## Two shared assets — never copied per-doc

- **`page.css`** — all the house style (`:root` tokens, dark-mode block,
  typography, `.wedge`/`.tag`/`.callout`/etc., the breadcrumb `.crumbs`, and the
  `.layout`/`.tabs`/`.panel` tab styles). Link it; never re-paste a `<style>` block.
- **`page.js`** — the vertical-tab driver. It activates one `.panel` at a time,
  syncs the `.tab` rail off the URL hash, and makes internal cross-reference
  links (`#section`, `#row-id`) switch to the right tab and scroll to the target.
  No-op on pages with no `.panel`. Link with `<script src="page.js"></script>`
  at the end of `<body>`.

## Body renders as vertical tabs

So the page is one section tall instead of one long scroll. Required structure:

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Brainstorm NNN — <topic></title>
  <link rel="stylesheet" href="page.css">
</head>
<body>
  <nav class="crumbs"><a href="index.html">Brainstorm index</a><span class="sep">/</span>NNN · <short title></nav>
  <h1>…</h1>
  <div class="meta">…date + status…</div>
  <div class="wedge">…the one-paragraph thesis…</div>
  <p>…abstract / framing…</p>   <!-- header stays full-width, above the tabs -->

  <div class="layout">
    <nav class="tabs" aria-label="Sections">
      <a class="tab" href="#summary">1. Executive summary</a>
      …one <a class="tab" href="#id"> per section, concise label…
    </nav>
    <main class="panels">
      <section class="panel" id="summary"><h2>1. Executive summary</h2> … </section>
      …one <section class="panel" id="…"> per <h2>; ids live on the section, not the h2…
    </main>
  </div>

  <hr><div class="meta">…footer…</div>   <!-- footer stays full-width, below the tabs -->
  <script src="page.js"></script>
</body>
```

## Rules

- The breadcrumb is always first in `<body>` and links back to `index.html`.
- Header (h1/meta/wedge/abstract) and footer stay **outside** `.layout`.
- Each `<h2>` section becomes a `<section class="panel" id="…">` with the id on
  the **section**, not the `<h2>`.
- The `.tab` rail mirrors the sections in order, with short labels.
