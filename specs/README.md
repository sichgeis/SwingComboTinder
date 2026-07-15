# Feature Specifications

Specifications are the approval boundary for substantial Swing Thing features. They preserve product meaning, accepted scope, constraints, progress, and validation across separate development tasks without requiring conversation history.

## When to create a specification

Use a dedicated `specs/<feature>.md` when work changes a substantial user flow, data model, architecture boundary, provider integration, or requires several coordinated increments. Small fixes, copy corrections, and routine maintenance can stay lightweight in `FEATURES.md` or proceed directly when the request is already unambiguous.

Do not create a specification merely to add ceremony. A proposed feature may remain in `FEATURES.md` while options are still being explored.

When introducing this workflow to an existing project, historical work may be consolidated into one Done baseline specification. Record observed outcomes and commit evidence; do not invent requirements, decisions, or approval history after the fact.

## Lifecycle

- **Proposed:** Discovery or options exist, but implementation is not authorized.
- **Approved:** The user accepted the specification as the implementation envelope.
- **In progress:** At least one approved implementation increment has started.
- **Blocked:** A material decision or external condition prevents meaningful progress.
- **Done:** Acceptance conditions pass and current product documentation reflects the lasting behavior.

Only explicit user approval moves a feature from Proposed to Approved. Routine implementation choices inside an approved specification do not require repeated confirmation. Changes to product meaning, scope, non-goals, privacy, permissions, paid providers, dependencies, destructive data handling, external communication, or release authority require renewed approval.

## Minimal specification shape

Adapt this structure to the feature and omit sections that add no useful information:

```markdown
# Feature name

- Status: Proposed | Approved | In progress | Blocked | Done
- Goal:

## Context

## User flow

## Requirements

## Scope

## Non-goals

## Acceptance criteria

## Technical constraints

## Validation

- Automated:
- Manual:

## Decisions

## Progress

## Next action
```

Write observable acceptance criteria rather than implementation aspirations. Record non-obvious decisions and constraints that another task would otherwise have to rediscover.

## Implementation and handoff

After approval:

1. Implement the smallest coherent increment.
2. Validate it proportionately.
3. Update progress, validation evidence, decisions when needed, and exactly one next action.
4. Update the matching `FEATURES.md` entry.
5. Commit the coherent increment when authorized and continue until acceptance passes or a material blocker appears.

Source code and tests remain authoritative for implemented behavior. If implementation exposes a mistaken requirement, update the specification through renewed user approval rather than silently diverging from it.
