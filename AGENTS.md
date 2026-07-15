# Repository Working Agreement

## Product and sources of truth

Swing Thing is a phone-first, offline-capable Swing vocabulary refresher. Preserve its German/English experience, self-contained figure packages, local-first session state, and touch-friendly Build and Browse workflows.

Use repository evidence in this order:

1. Source code, tests, and runtime configuration describe implemented behavior.
2. An approved feature specification under `specs/` defines accepted scope that is being implemented.
3. `FEATURES.md` owns feature status, progress, validation evidence, blockers, and the next action.
4. `README.md` describes the current product and developer entry points.
5. `figures/README.md` and `image-generation/` own their specialized content and artwork workflows.

When these disagree, do not silently choose the convenient version. Reconcile the durable documentation as part of the same coherent change or ask when product meaning is unclear.

## Start of task

- Read this file, `README.md`, and `FEATURES.md`, then the relevant approved specification and specialized documentation.
- Run `git status --short --branch` and preserve every unrelated staged, unstaged, or untracked change.
- Work directly on `main` unless the user explicitly requests isolation or concurrent work makes a branch necessary.
- Identify the smallest coherent increment and the validation appropriate to it before editing.

## Specification-driven feature workflow

- Small fixes, content corrections, and straightforward maintenance do not require a dedicated specification.
- Substantial user-flow, data-model, architecture, provider, or multi-stage work starts as a `FEATURES.md` entry with status `Proposed`.
- Give a complex feature its own `specs/<feature>.md`. Keep options and discovery separate from accepted requirements until the user chooses a direction.
- Only explicit user approval changes a feature or specification to `Approved` and authorizes implementation within its stated scope and non-goals.
- Use `In progress`, `Blocked`, and `Done` literally. A blocked feature records the material blocker; an active feature has exactly one next action.

After approval, repeat this bounded loop without reopening routine in-scope decisions:

1. Implement the next coherent increment.
2. Run focused checks and the canonical validation appropriate to the increment.
3. Update the specification and `FEATURES.md` with progress, evidence, decisions when needed, and exactly one next action.
4. Review the diff and create a focused commit when authorized.
5. Continue until acceptance passes or a material decision falls outside the approval envelope.

Ask before changing approved product meaning, scope, non-goals, privacy, permissions, paid providers, dependencies, destructive data handling, external communication, or release authority.

## Validation

- Prefer `npm run check` for application and tooling changes; it runs lint, strict type checks, tests, and the production build.
- Use focused tests while iterating, but do not report completion without the relevant canonical validation.
- Gesture behavior, responsive layout, installation, and other visual interactions may still require explicit browser or device verification. Record manual checks honestly in the active specification.
- Image generation makes paid external requests and requires local credentials. Do not run it merely as validation; use dry planning or existing tests unless the user authorized a real generation run.

## Delivery workflow

- Treat every requested code, content, configuration, or documentation change as authorization to commit it, push `main`, and release it to GitHub Pages unless a more specific workflow instruction limits that authority.
- Commit each coherent change with a descriptive message and push it to `origin/main`.
- A push to `main` triggers the GitHub Pages workflow and publishes the site automatically. After a successful push, do not routinely monitor the workflow or verify the public site unless the user explicitly requests it.
- If `main` must be updated against its remote counterpart, rebase rather than creating a merge commit.
- If a deployment failure is reported or otherwise discovered, investigate and fix it directly on `main`, then push the correction.

## Safety and handoff

- This is a personal, fast-moving app. Favor a working live improvement over branch or release ceremony.
- Never discard user work or commit secrets, dependencies, generated `dist/` output, caches, local machine files, or unpromoted image candidates.
- Leave repository state recoverable by updating the active specification and `FEATURES.md` before handoff. Record validation actually run, any blocker, and the single next action.
- A feature is `Done` only when its acceptance conditions pass and lasting behavior is reflected in the appropriate current source of truth.
