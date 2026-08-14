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
   `date`, `sortDate`, and 2-3 `stats` pairs pulled from the page's own header
   `.meta` stats (e.g. wallet count, fill count, net PnL). Keep the
   tone/format consistent with existing entries.
   - `date` is *displayed text* on the card — use the page's actual stated
     deploy date if it has one (like tempo-tcat's "2026-08-06"). If the source
     file doesn't state a calendar date anywhere (like stable-fefer, which
     only gives block numbers), don't invent one — use a short honest label
     instead, e.g. the launchpad/protocol name from the page's own eyebrow.
   - `sortDate` is an ISO date used only for homepage ordering, never shown.
     Use the real deploy date if known; otherwise use today's date (that's a
     true fact — it's when the page was published) rather than leaving it to
     fall back on a non-date `date` string, which would break the sort.

6. **Sanity check.** Open the new file mentally (or with a quick grep) to
   confirm there's no leftover inline `<style>` duplicate of theme.css, no
   broken relative paths (use root-absolute `/assets/theme.css`, `/pages/...`
   links, not relative `../..`), and the JS data/rendering logic from the
   source file is otherwise untouched — never rewrite the analysis numbers or
   logic, only the presentation shell.

7. **Generate its social card — this step is not optional.** Every published
   page must have a working Open Graph + Twitter card, no exceptions. Run:
   ```
   node scripts/generate-og.mjs \
     --out "pages/<slug>/card.png" \
     --title "<short page title>" \
     --tagline "<the one-line hook, same as the page's own tagline>" \
     --chain "<chain>" --ticker "<ticker>" --date "<display date>" \
     --stat "Label:Value" --stat "Label:Value" --stat "Label:Value"
   ```
   Reuse the same 2-3 stats used for the homepage card. Then add the full tag
   set to the new page's `<head>` — all of these, not a subset (copy the block
   from `pages/tempo-tcat/index.html` and swap the values):
   ```html
   <meta property="og:image" content="https://<site-domain>/pages/<slug>/card.png">
   <meta property="og:image:width" content="1200">
   <meta property="og:image:height" content="630">
   <meta property="og:image:type" content="image/png">
   <meta name="twitter:card" content="summary_large_image">
   <meta name="twitter:image" content="https://<site-domain>/pages/<slug>/card.png">
   <meta name="twitter:image:alt" content="<one-sentence description of what's in the card>">
   ```
   `og:image` and `twitter:image` must be byte-identical absolute URLs, and
   `twitter:card` must be exactly `summary_large_image` — the validator in the
   next step checks both.
   (If `node_modules`/Playwright aren't installed yet, run `npm install` then
   `npx playwright install chromium` once — this is a one-time local setup,
   never part of Netlify's build.)

8. **Validate before shipping.** Run `node scripts/check-og.mjs`. It must
   print all-green and exit 0. If it reports a problem, fix it and re-run —
   do not proceed to deploy with a failing check. This is the same gate the
   `deploy-site` skill runs, so catching it here just saves a round trip.

9. **Ship it.** Use the `deploy-site` skill to commit and push (including the
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
