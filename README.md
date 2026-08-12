# Chain Teardowns

On-chain trade reconstructions, published as static pages. No build step — every
page is plain HTML/CSS/JS sharing one design system.

## Structure

```
index.html          the homepage — lists every analysis page
assets/theme.css     the shared design system (colors, type, components)
pages/<slug>/index.html   one folder per analysis
netlify.toml         Netlify config (static publish, no build command)
```

## Adding a new analysis

Just hand Claude the new HTML file and say "add this page" — the
`add-analysis-page` skill in `.claude/skills/` takes it from there: it re-skins
the file onto `assets/theme.css`, drops it in `pages/<slug>/`, adds it to the
homepage grid, and pushes. Netlify picks up the push and redeploys automatically.

## Deploys

This site deploys automatically: every push to `main` on GitHub triggers a
Netlify build. No manual deploy step needed.
