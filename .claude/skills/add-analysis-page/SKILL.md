---
name: add-analysis-page
description: Take a new standalone HTML analysis file the user provides and publish it as a new page on the Chain Teardowns site, matching the site's existing design system. Use this whenever the user says things like "add this page", "here's my next analysis", or uploads/pastes/references a new HTML file meant for the site.
---

# Add an analysis page to the site

The user is not technical. They will hand you a finished HTML file (usually
written by Claude in a separate conversation doing token/wallet analysis) and
expect you to fold it into the published site with no further input from them
beyond maybe a filename or a quick confirmation. Handle everything else.

## Steps

1. **Locate the source file.** It may be referenced by path, pasted inline, or
   sitting in `~/Downloads`. If a plain filename is mentioned and not found in
   the project, check `~/Downloads` and `~/Desktop` before asking the user.
   If the file was pasted into the conversation as a document, always read the
   actual file from disk if one exists rather than the pasted text — pasted
   HTML can pick up mangled/mis-encoded characters (smart quotes, dashes,
   ellipses, arrows) in transit that the on-disk file won't have.

2. **Pick a slug.** Derive a short kebab-case slug from the token/chain/topic
   (e.g. `tempo-tcat`, `base-fren`). Check `pages/` for collisions; disambiguate
   if needed. Don't ask the user to pick one unless the title is too generic to
   derive anything sensible from.

3. **Re-skin onto the shared design system** (`assets/theme.css`). Do not paste
   the source file's own `<style>` block into the new page.
   - Replace any inline `<style>` block with:
     `<link rel="stylesheet" href="/assets/theme.css">` (plus the same Google
     Fonts `<link>` tags already used on other pages — Bricolage Grotesque +
     IBM Plex Mono — copy them from `pages/tempo-tcat/index.html`).
   - Map the source markup onto the existing component classes wherever the
     shape matches: `.wrap`, `header`/`.eyebrow`/`h1`/`.lede`/`.meta`, `.tape`
     price-ladder, `.bar`/`.ctl` sort controls, `.head`/`.row` sortable table,
     `.drawer`/`.lh`/`.lr` expandable ledger, `.tag`, `.mini` link buttons,
     `footer`. Most Claude-generated wallet/trade teardowns will already be
     shaped like this since they came from the same kind of prompt.
   - If the new page's content doesn't fit those components (e.g. it's not a
     wallet ledger), keep its unique structure and CSS, but:
     - reuse the `:root` color tokens and fonts from `assets/theme.css` instead
       of inventing new ones,
     - keep the same page chrome (`.wrap` max-width, `header`/`footer` styling,
       grid-paper body background),
     - put any genuinely page-specific CSS in a `<style>` block scoped to that
       page only (don't add one-off rules to the shared theme.css).
   - Add the shared nav bar right after `<body>`:
     ```html
     <nav class="sitenav">
       <a class="brand" href="/">Chain Teardowns</a>
       <span class="sp"></span>
       <a href="/">All analyses</a>
     </nav>
     ```
   - Fix `og:url` / `twitter` meta tags to point at
     `https://<site>/pages/<slug>/` (check `netlify.toml`/README or ask if the
     live domain isn't yet known — otherwise reuse the domain already present
     in other pages' meta tags).

4. **Save it** to `pages/<slug>/index.html`.

5. **Add it to the homepage.** Edit the `PAGES` array in `index.html` (root):
   add one object with `slug`, `title`, `tagline`, `desc`, `chain`, `ticker`,
   `date`, and 2-3 `stats` pairs pulled from the page's own header `.meta`
   stats (e.g. wallet count, fill count, net PnL). Keep the tone/format
   consistent with the existing entry.

6. **Sanity check.** Open the new file mentally (or with a quick grep) to
   confirm there's no leftover inline `<style>` duplicate of theme.css, no
   broken relative paths (use root-absolute `/assets/theme.css`, `/pages/...`
   links, not relative `../..`), and the JS data/rendering logic from the
   source file is otherwise untouched — never rewrite the analysis numbers or
   logic, only the presentation shell.

7. **Generate its social card.** Run the OG image generator so links to this
   page render properly when shared:
   ```
   node scripts/generate-og.mjs \
     --out "pages/<slug>/card.png" \
     --title "<short page title>" \
     --tagline "<the one-line hook, same as the page's own tagline>" \
     --chain "<chain>" --ticker "<ticker>" --date "<display date>" \
     --stat "Label:Value" --stat "Label:Value" --stat "Label:Value"
   ```
   Reuse the same 2-3 stats used for the homepage card. Then add to the new
   page's `<head>`:
   ```html
   <meta property="og:image" content="https://<site-domain>/pages/<slug>/card.png">
   <meta name="twitter:image" content="https://<site-domain>/pages/<slug>/card.png">
   ```
   (If `node_modules`/Playwright aren't installed yet, run `npm install` then
   `npx playwright install chromium` once — this is a one-time local setup,
   never part of Netlify's build.)

8. **Ship it.** Use the `deploy-site` skill to commit and push (including the
   new `card.png` — it's a normal tracked file, not gitignored). Netlify
   redeploys automatically on push — report back the live URL for the new page
   once pushed (`https://<site>/pages/<slug>/`).

## What not to do

- Don't ask the user for design decisions (colors, layout) — the whole point
  is that the theme is already decided. Just apply it.
- Don't modify `assets/theme.css` unless a genuinely new reusable component is
  needed across pages (e.g. a chart type no existing page uses) — and if so,
  add it there rather than duplicating it per-page.
- Don't rename or restructure existing pages while adding a new one.
