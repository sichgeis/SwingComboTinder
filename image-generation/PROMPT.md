# Image-generation prompt

The runtime prompt starts with the fixed [`DEFAULT_INSTRUCTIONS`](../tools/image-studio/prompt.ts) constant. It is not extended with the move name, `Pose direction`, or `Character direction`. A figure may optionally define one short `Generation note` in its `notes.md`; when present, the tool appends it under a clearly bounded `FIGURE-SPECIFIC CORRECTION` heading.

Image 1 remains the teaching-frame pose reference; every later uploaded image is style-only. The effective prompt, including a saved generation note, is exposed in the browser studio through `/api/prompt` for review before generation.
