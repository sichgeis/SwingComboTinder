# Studio editorial cockpit

- Status: Done
- Approved: 2026-07-15
- Goal: Turn the local Studio into a compact, attention-first editorial cockpit while retaining its dark art-deco identity and safe persistence behavior.

## Context

The completed Content Studio is functionally capable, but desktop review found that branding and repeated status data occupy more space than the frequent editorial decisions. The figure library is dense, technical identity looks editable, and the Image Queue presents completed figures before exceptions that need attention. Initial loading and incompatible/stale-server failures can also resemble a legitimately empty catalog.

This specification incorporates the useful, immediately actionable subset of the older maintenance-workspace draft without introducing durable review state or another data model.

## User flow

### Content

1. Open a compact Studio shell and see an explicit loading, ready, or recovery state.
2. Filter the figure library by style or current derived attention state.
3. Select a figure and edit its Basics, localized guides, and ordered resources.
4. Inspect immutable technical identity without mistaking it for editable content.
5. Compare the live card in German or English and on front or back.
6. See saved, unsaved, invalid, updating, and saved-success states clearly.
7. Revert a draft, save it, or save and advance to the next visible figure.

### Image Queue

1. Enter an attention-first queue showing new candidates, rework, missing masters, or missing pose references before approved work.
2. Filter by derived status and style, with compact factual counts.
3. Select all visible figures or clear the selection.
4. Review a plain-language generation plan before starting paid generation.
5. Continue to compare, promote, approve, reopen, and mark artwork with visibly distinct actions.

## Requirements

- Replace the oversized masthead with a compact persistent shell containing product identity, workspace navigation, and connection/model status.
- Preserve the current palette and editorial typography, but improve density, hierarchy, focus states, and control grouping.
- Content library filters must use existing derived facts only: validity, resource count, fallback artwork, and active draft state.
- Repeated healthy statuses should recede; invalid, draft, missing-resource, and fallback facts should remain obvious.
- Technical identity remains read-only and collapsible.
- Save, save-and-next, and revert must retain conflict detection, complete validation, and unsaved-change protection.
- The existing card renderer remains the preview authority.
- Image Queue filtering must not create persistent editorial review state.
- Paid generation remains explicit and is never triggered during validation.
- Loading failures must display an actionable error rather than an empty valid catalog.
- Keyboard focus and pointer targets must remain visible and usable.
- The Studio is a desktop-only local production tool. Supported UX, layout decisions, and visual validation target desktop browser windows.

## Non-goals

- Changing the figure data model or production app
- Adding durable review/approval state for copy
- AI-assisted writing or translation
- Drag-and-drop resource or image ordering
- Changing image providers, prices, permissions, or generation defaults
- Rebuilding the Studio with a framework or adding dependencies
- Mobile and tablet support for the Studio
- Mobile-specific navigation, layout, interaction, or validation requirements

## Acceptance criteria

- The shell uses materially less vertical space in a desktop browser window.
- Content exposes style and attention filters, explicit loading/error/empty states, and a less repetitive figure list.
- Technical identity is collapsed by default and editable fields remain clearly distinct.
- Revert, Save, and Save + next are available only in appropriate states.
- Image Queue defaults to attention-needed work, supports status/style filters plus select-visible/clear, and shows an accurate request plan.
- Approved figures remain reachable without dominating the default queue.
- Existing content persistence, preview, generation, promotion, image approval, and rework behavior continues to work.
- `npm run check` passes.
- Real desktop screenshots demonstrate the Content and Image Queue states using repository data.

## Technical constraints

- Continue using the existing local Node server and dependency-free browser modules.
- Derive UI state from the existing `/api/config`, `/api/figures`, and content endpoints.
- Preserve atomic saves and stale-revision conflict handling.
- Do not make paid image requests during automated or manual validation.

## Decisions

- The Studio is a desktop-only editorial tool. Responsive behavior that happens to remain in the implementation is incidental and is not a supported product requirement.
- Brand character remains in color, typography, and small accents rather than a large hero masthead.
- The work ships in two coherent increments: Content cockpit, then attention-first Image Queue.
- The user explicitly approved specification and implementation on 2026-07-15.

## Progress

- 2026-07-15: Reviewed the current Studio with real repository data, including desktop behavior used to define the supported cockpit.
- 2026-07-15: Specification approved; implementation started.
- 2026-07-15: Shipped the compact persistent shell, derived Content filters, explicit catalog recovery state, remembered figure selection, collapsible technical identity, field counts, and draft/revert/save/save-next actions.
- 2026-07-15: Product direction clarified after delivery: the Studio is desktop-only; existing responsive behavior is not supported scope.
- 2026-07-15: Shipped the attention-first Image Queue with derived view filters, compact metrics, visible-selection controls, request planning, and expanded review controls whenever approved artwork has new candidates or is marked for rework.
- 2026-07-15: Made the preview stylesheet self-contained inside the sandboxed iframe after browser validation exposed that the previous linked stylesheet could report “Live” while rendering an empty card.

## Validation

- Automated: `npm run check` passes with 20 test files and 56 tests, strict type checking, lint, and the production build.
- Browser: A temporary Studio on port 4175 loaded the real 42-figure catalog without page errors. Desktop checks covered Content selection/live card rendering and the default attention queue without modifying source content.
- Screenshots: `/private/tmp/swing-thing-studio-cockpit-screenshots/content-desktop.png` and `/private/tmp/swing-thing-studio-cockpit-screenshots/image-queue-desktop.png`.
- Paid generation: Not run, as required.

## Next action

None; use the cockpit for real editorial work and derive any future workflow state from observed needs.
