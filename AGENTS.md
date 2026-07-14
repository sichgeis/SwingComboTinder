# Repository Working Agreement

## Delivery workflow

- Work directly on `main`. Do not create feature branches, pull requests, or worktrees unless the user explicitly requests one.
- Treat every requested code, content, configuration, or documentation change as authorization to commit it, push `main`, and release it to GitHub Pages without asking again.
- After implementing a change, run the relevant checks. Prefer `npm run check` for application changes.
- Commit each coherent change with a descriptive message and push it to `origin/main`.
- A push to `main` triggers the GitHub Pages workflow. Monitor that workflow through completion and verify the public site when the change affects the deployed app.
- If the deployment fails, investigate and fix it directly on `main`, then push and monitor the replacement deployment.

## Safety and scope

- This is a personal, fast-moving app. Favor a working live improvement over branch or release ceremony.
- Preserve unrelated local changes and never discard user work.
- Do not commit secrets, dependencies, generated `dist/` output, caches, or local machine files.
- Use rebasing rather than merge commits if `main` must be updated against its remote counterpart.
