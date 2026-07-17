# Studio teaching-pose upload

- Status: Done
- Approved: 2026-07-17
- Goal: Add teaching-pose images to a figure directly from the Dance Card Studio by file selection, drag and drop, or clipboard paste.

## Context

The Image Queue already discovers PNG files in `teaching-frames/` and can exchange an alternate with `selected.png`. Adding those files still requires manual filesystem work, which is especially awkward when the useful source is a copied screenshot.

This feature extends the existing chooser into a local pose manager. It does not invoke an image provider.

## User flow

1. Open **Teaching poses** from any Image Queue card, including one with no pose.
2. Choose a PNG, JPEG, or WebP file, drag one onto the upload area, or paste a copied image while the dialog is open.
3. The Studio validates and normalizes the image to PNG.
4. If the figure has no `selected.png`, the first image becomes the current pose. Otherwise it is added as a named alternative without changing future generation.
5. Review the refreshed pose library and explicitly choose **Use this pose** when an uploaded alternative should become current.

## Requirements

- Expose the teaching-pose action on every Image Queue figure, regardless of its current pose count or approval state.
- Accept one image at a time through a file picker, drag and drop, or an image item from the clipboard.
- Accept PNG, JPEG, and WebP input up to 20 MB and 40 megapixels; reject empty, unsupported, corrupt, or oversized input.
- Decode the image server-side, honor its orientation, and save canonical PNG output.
- Keep all output inside the requested figure's direct `teaching-frames/` directory.
- Install the first pose as `selected.png` using exclusive creation so a concurrent upload cannot overwrite it.
- Give later uploads a sanitized source-derived name plus a unique suffix, and leave `selected.png` unchanged.
- Refresh the dialog and queue state immediately and report whether the image became current or an alternative.
- Keep credentials in the server and make no paid image-generation request.

## Non-goals

- Do not crop, rotate manually, retouch, annotate, delete, rename, reorder, or bulk-upload poses.
- Do not accept SVG, GIF, video, remote URLs, or arbitrary filesystem paths.
- Do not silently replace an existing selected pose or current card image.
- Do not trigger generation or change approval, rework, publication, or figure notes.
- Do not add a dependency; use the repository's existing Sharp image pipeline.

## Acceptance criteria

- File selection, drag and drop, and clipboard image paste reach the same validated upload path.
- A pose-less figure receives a valid normalized `selected.png` and becomes generation-ready.
- A figure with a current pose receives a PNG alternative while its selected bytes remain unchanged.
- Invalid uploads create no pose file and show a useful error.
- Uploaded alternatives remain compatible with the existing reversible pose-selection workflow.
- Focused tests, `npm run check`, browser syntax checks, and a real non-paid Studio interaction pass.

## Decisions

- The upload request uses the image as its raw HTTP body. The local Studio needs one file plus figure ID and source name, so multipart parsing would add complexity without product value.
- New alternatives do not become current automatically. Upload and selection are separate decisions, preventing a pasted screenshot from silently changing later image generation.
- Every accepted input becomes PNG so pose discovery and the generation contract remain unchanged.

## Progress

- Implemented the shared raw-image endpoint, bounded Sharp normalization, exclusive first-pose and safe alternative persistence, universal pose-manager action, picker/drop/paste UI, focused tests, and durable documentation.

## Validation

- Automated: `npm run check` passes with 22 test files and 76 tests plus the production PWA build; `node --check tools/image-studio/static/app.js` passes. Focused repository tests cover JPEG/WebP normalization, safe source-derived names, unchanged selected bytes, first-pose installation, corrupt/unsupported/oversized rejection, reversible selection, and traversal rejection.
- Browser: An isolated Studio on port 4178 loaded the real 42-card catalog. Every active and pose-less card exposed the pose manager. The Texas Tommy dialog accepted a real clipboard PNG and a WebP through the file chooser, normalized both into uniquely named alternatives, kept `selected.png` current, refreshed from three to five pose cards, and showed no browser errors. The rendered drop target uses the same upload function. Both validation images were removed afterward, returning the package to its original three poses. No generation request was sent.

## Next action

None; use Teaching poses whenever a figure needs a new generation reference.
