# Repository Working Agreement

## Delivery workflow

- Work directly on `main`. Do not create feature branches, pull requests, or worktrees unless the user explicitly requests one.
- Treat every requested code, content, configuration, or documentation change as authorization to commit it, push `main`, and release it to GitHub Pages without asking again.
- After implementing a change, run the relevant checks. Prefer `npm run check` for application changes.
- Commit each coherent change with a descriptive message and push it to `origin/main`.
- A push to `main` triggers the GitHub Pages workflow and publishes the site automatically. After a successful push, do not routinely monitor the workflow or verify the public site unless the user explicitly requests it.
- If a deployment failure is reported or otherwise discovered, investigate and fix it directly on `main`, then push the correction.

## Safety and scope

- This is a personal, fast-moving app. Favor a working live improvement over branch or release ceremony.
- Preserve unrelated local changes and never discard user work.
- Do not commit secrets, dependencies, generated `dist/` output, caches, or local machine files.
- Use rebasing rather than merge commits if `main` must be updated against its remote counterpart.
