# Swing Move Image Catalog

This catalog contains 42 swing-dance figures.

Open `index.html` for the visual catalog or `youtube-screenshot-list.html` for the numbered capture list. The pages use locally stored copies of selected tutorial-video thumbnails as literal visual references and link to both the exact source and an image search for alternatives.

This directory is repository-only research material. It is deliberately outside `public/` and is not included in the deployed app. Selected frames, YouTube provenance, and artwork history belong in the corresponding package under `figures/`.

To store the thumbnails locally, run:

    python3 download_images.py

The downloaded files will be placed in `images/`. The committed catalog already includes them; rerun the script only to restore missing catalog thumbnails.

## Important validation notes

- Entries marked “Exact named tutorial” are the strongest literal matches.
- Some curriculum-specific figures do not have a uniquely standardized public name. Those entries are explicitly marked as closest-family or placeholder references.
- A video thumbnail is not always the best frame. The `card_front_key_frame` field states which moment inside the linked tutorial should be captured or redrawn.
- The catalog is for composition and documentation research only. The thumbnails are not card art. Review source rights before any direct reuse or publication outside this reference context.
