---
name: deploy-site
description: Commit and push the Chain Teardowns site so Netlify's GitHub integration redeploys it, and report the live URL. Use whenever the user asks to "deploy", "publish", "push", "ship it", or after add-analysis-page finishes changing files.
---

# Deploy the site

This site auto-deploys: once the GitHub repo is linked to Netlify (see setup
below), every push to `main` triggers a Netlify build with no extra step. This
skill's job is just to get committed changes onto GitHub correctly, then
confirm the deploy went out.

## Normal deploy (repo already linked to Netlify)

1. **Run `node scripts/check-og.mjs` first. This is a hard gate, not a
   suggestion.** It must exit 0 (all pages print green) before anything gets
   committed. If any page fails — missing tag, missing image file, wrong
   `twitter:card` type, wrong dimensions, over Twitter's 5MB limit — stop and
   fix it (usually: go back and run `scripts/generate-og.mjs` for whichever
   page is missing its card, or fix a typo'd meta tag) and re-run the
   validator. Never push a page with a failing OG check — every URL on this
   site must have a working card, no exceptions.
2. `git status` — review what changed. Confirm nothing unexpected (secrets,
   stray files) is staged.
3. `git add` the specific changed files (not `-A` blindly — check the diff
   makes sense first). Make sure any new `card.png` is included.
4. Commit with a short message describing what page/change this is (e.g.
   `Add tempo-tcat analysis page`).
5. `git push`.
6. Check deploy status: `netlify status` or `netlify open` if the CLI is
   linked, or just tell the user the push went out and Netlify will build
   within ~1 minute. If the Netlify CLI is linked (`netlify link` has been
   run in this repo), you can run `netlify watch` briefly or
   `netlify api listSiteDeploys --data '{"site_id":"<id>"}'`
   isn't needed for routine use — a plain push + Netlify's own dashboard
   notification is enough. Don't over-engineer this step.
7. Report the live URL(s) affected back to the user in plain language — they
   don't need to see raw git/netlify output, just "it's live at X".

## One-time setup (only needed once, or if CI/CD isn't wired up yet)

This site needs two things authenticated before automated deploys work.
Neither can be done non-interactively — both require the user to complete a
browser login on their own machine:

1. **GitHub CLI** (`gh`): run `gh auth login` and follow the prompts (choose
   GitHub.com, HTTPS, login with a web browser). Needed to create/push to the
   repo on the user's behalf.
2. **Netlify CLI** (`netlify`, install with `npm install -g netlify-cli` if
   missing): run `netlify login`, which opens a browser to authorize.

Once both are authenticated:

1. Create the GitHub repo: `gh repo create <name> --public --source=. --remote=origin` (confirm repo name and public/private with the user first — this is visible to others).
2. Push: `git push -u origin main`.
3. Create the Netlify site: `netlify sites:create --name <name>` (falls back
   to prompting for a team if `--account-slug` isn't given — that's fine, let
   it prompt or just omit the flag). This also links the CLI to the new site
   locally (creates `.netlify/state.json`, gitignored).
4. Do one manual deploy so there's something live immediately:
   `netlify deploy --prod --dir=.`
5. **Link GitHub for CI/CD.** `netlify init`'s interactive wizard does not
   work reliably in a non-interactive shell (its GitHub-authorization prompt
   needs a real TTY and will crash with `ERR_USE_AFTER_CLOSE`). Don't fight
   it — instead tell the user to do it in their browser, it's one time only:
   - Open `https://app.netlify.com/projects/<site-name>/configuration/deploys`
   - Click "Link repository" (or "Link site to Git")
   - Choose GitHub, authorize the Netlify app if asked, pick the repo
   - Branch `main`, leave build command blank, publish directory `.`
   Confirm it worked by checking
   `netlify api getSite --data '{"site_id":"<id>"}'` and looking for
   `build_settings.repo_url` pointing at the right repo — or just push a
   commit and confirm a new deploy appears in
   `netlify api listSiteDeploys --data '{"site_id":"<id>"}'` with a matching
   `commit_ref`.
6. From then on, every `git push` to `main` triggers an automatic Netlify
   deploy — no further CLI use required for routine publishing.

## What not to do

- Don't force-push.
- Don't run `netlify deploy --prod` manually as the normal workflow once
  GitHub CI/CD is linked — that bypasses the git history and defeats the point
  of "push to deploy". Only use manual deploys as a fallback if the GitHub
  link is broken, and say so explicitly if you do.
- Don't commit `.netlify/` or `node_modules/` (already gitignored).
