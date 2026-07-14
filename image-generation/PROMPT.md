# Image-generation prompt

The runtime prompt is the fixed [`DEFAULT_INSTRUCTIONS`](../tools/image-studio/prompt.ts) constant. It is sent verbatim for every figure and is deliberately not extended with the move name, `notes.md`, or any other figure-specific text.

Image 1 remains the teaching-frame pose reference; every later uploaded image is style-only. The fixed prompt is exposed in the browser studio through `/api/prompt` for review before generation.
