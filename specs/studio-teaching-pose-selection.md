# Studio teaching-pose selection

- Status: Done
- Approved: 2026-07-17
- Goal: Let a maintainer choose an existing alternate teaching pose from the Dance Card Studio while preserving the canonical generation input contract.

## Context

Image generation always reads `teaching-frames/selected.png`. Most figure packages contain only that file, while some already keep additional PNG frames such as `alternative.png`, `alternative2.png`, or `alternate-cuddle.png`. Changing the selected pose currently requires manual filesystem work.

The phrase “swap the teaching pose” is implemented literally: selecting an alternate exchanges its file contents with `selected.png`. The newly chosen image becomes the generation input, while the previous selected image remains recoverable in the alternate slot.

## User flow

1. Open Image Queue and find a figure with alternate teaching poses.
2. Select **Swap pose** beside the current teaching pose.
3. Compare the current pose with every direct PNG alternative in that figure’s `teaching-frames/` directory.
4. Choose an alternate. The Studio swaps it with `selected.png`, refreshes the figure, and reports success.
5. Generate or review artwork separately when desired.

## Requirements

- Discover `selected.png` and direct sibling `*.png` alternatives without traversing nested directories.
- Show the current selection and visual alternatives in a dedicated, accessible dialog.
- Offer the action only when at least one alternate exists.
- Accept only a known alternate belonging to the requested figure and reject `selected.png`, unknown paths, traversal, and non-PNG files.
- Preserve both images by exchanging their contents; do not delete or duplicate the previous teaching pose.
- Use temporary files and recovery so a failed operation restores the original pair.
- Refresh all Studio figure data and image URLs after a successful swap.
- Keep the generation pipeline reading `teaching-frames/selected.png` unchanged.

## Scope

- Teaching-pose discovery and swap persistence in `tools/image-studio/`.
- A pose chooser in the existing Image Queue figure card.
- Focused repository tests, browser verification, and workflow documentation.

## Non-goals

- Do not upload, crop, edit, rename, delete, or reorder teaching frames.
- Do not select a frame from a video or create a teaching frame from a transcript.
- Do not trigger paid generation, change current artwork, alter image approval/rework state, or rewrite figure notes automatically.
- Do not support JPEG/WebP alternatives in this increment; the canonical and existing alternate workflow uses PNG.

## Acceptance criteria

- A figure with alternatives exposes a visual Swap pose workflow; a figure with only `selected.png` does not.
- Choosing an alternate makes its prior pixels available at `selected.png` and keeps the former selection at the chosen alternate path.
- Repeating the same swap restores the original pair.
- Invalid figure IDs and pose paths cannot modify filesystem content.
- Existing generation planning and prompt behavior continue to use the selected pose.
- Automated tests and `npm run check` pass, and the real Studio exposes the workflow without sending an image request.

## Validation

- Automated: `npm run check` passes with 22 test files and 68 tests plus the production PWA build. Focused repository tests verify discovery, a reversible two-swap round trip, and traversal rejection without content changes. `node --check` passes for both dependency-free Studio browser modules.
- Browser: An isolated Studio on port 4176 loaded the real 42-card catalog at 1600 × 1000. The approved Texas Tommy card exposed the pose action; its dialog showed `selected.png`, `alternative.png`, and `alternative2.png`. Selecting `alternative.png` exchanged both SHA-256 hashes, and repeating the UI operation restored both originals. There were no browser errors, notes/status changes, or image-generation requests.

## Decisions

- File exchange is preferred over copying because it preserves a reversible two-slot pose library without introducing selection metadata or changing the generator contract.
- Pose choice remains an artwork-production concern in Image Queue rather than figure content.

## Progress

- Implemented direct PNG discovery, safe literal content exchange with recovery, API refresh/events, approved-card and active-card actions, the visual chooser, focused tests, and durable workflow documentation.

## Next action

None; the feature is complete.
