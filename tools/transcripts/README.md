# Transcript maintenance tools

The URL-driven downloader stores complete available YouTube captions directly in a figure's
versioned `transcripts/` research directory. It requires Python 3.11 or newer, but no package
installation, API key, or paid provider.

## Download captions

Use the repository task for the common single-video case:

```sh
task transcripts:download \
  FIGURE=lindy/lindy-circle \
  URL='https://www.youtube.com/watch?v=P083vG0JKB8'
```

`FIGURE` is always the repository-relative `<style>/<figure-id>` pair. `LANGUAGE` defaults to
`en`. The CLI accepts watch, short, embed, live, and `youtu.be` URLs or a bare video ID.

For several researched videos that all belong to the same figure, call the Python CLI directly:

```sh
python3 tools/transcripts/download_transcripts.py \
  --figure lindy/lindy-circle \
  'https://youtu.be/VIDEO_ID_01' \
  'https://youtu.be/VIDEO_ID_02'
```

The tool gets the public video title and channel through YouTube's keyless oEmbed response. If that
metadata is unavailable, caption retrieval still succeeds with explicit fallback labels. A known
single video's research metadata can be supplied directly:

```sh
python3 tools/transcripts/download_transcripts.py \
  --figure lindy/lindy-circle \
  --title 'Lindy Circle technique' \
  --channel 'Laura Glaess' \
  'https://youtu.be/VIDEO_ID_01'
```

Output filenames begin with the stable video ID. Before any remote request, the tool also scans old
and new transcript filenames for `- Video ID:` metadata. An already archived video is skipped. Use
`OVERWRITE=1` with the Task command, or `--overwrite` with the Python CLI, to refresh the free
provider response and rewrite that transcript while preserving an existing filename.

The provider chain is deliberately limited to the ignored local cache and the free hosted
`youtube-transcript.ai` caption endpoint. It never calls `youtube-transcript.dev`, performs audio
transcription, or reads an API key. Captions may be automatic, incomplete, unavailable, or wrong;
the Markdown files are research evidence rather than authoritative teaching copy.

## Legacy batch import

`import_transcripts.py` remains available for the older CSV-oriented sibling-project output:

```sh
task transcripts:plan SOURCE=/path/to/output
task transcripts:import SOURCE=/path/to/output
```

Both tools keep production code independent of transcripts. When using transcript evidence to edit
a card, follow [`figures/CARD_BACK_STYLE_GUIDE.md`](../../figures/CARD_BACK_STYLE_GUIDE.md).
