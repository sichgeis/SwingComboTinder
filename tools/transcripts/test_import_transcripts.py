from __future__ import annotations

import csv
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("import_transcripts.py")
SPEC = importlib.util.spec_from_file_location("import_transcripts", MODULE_PATH)
assert SPEC and SPEC.loader
IMPORTER = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = IMPORTER
SPEC.loader.exec_module(IMPORTER)


class TranscriptImporterTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.source = self.root / "source"
        self.figures = self.root / "figures"
        self.figure = self.figures / "lindy" / "tuck-turn"
        self.figure.mkdir(parents=True)
        self.source.mkdir()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_index(self, rows: list[dict[str, str]]) -> None:
        with (self.source / "index.csv").open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=("dance", "figure", "status", "output_file"),
            )
            writer.writeheader()
            writer.writerows(rows)

    def completed_row(self, output_file: str = "Lindy Hop/Tuck Turn/01 - Lesson.md"):
        return {
            "dance": "Lindy Hop",
            "figure": "Tuck Turn",
            "status": "completed",
            "output_file": output_file,
        }

    def write_transcript(self, relative: str, content: str = "transcript\n") -> Path:
        path = self.source / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def test_mapping_contains_all_42_figures(self):
        self.assertEqual(len(IMPORTER.FIGURE_DIRECTORIES), 42)
        self.assertEqual(
            IMPORTER.FIGURE_DIRECTORIES[("Lindy Hop", "Sliding Door")],
            "lindy/schiebetuer",
        )
        self.assertEqual(
            IMPORTER.FIGURE_DIRECTORIES[("Lindy Hop", "Swingout to Closed")],
            "lindy/swingout-closed-end",
        )

    def test_only_completed_rows_are_loaded(self):
        completed = self.completed_row()
        failed = {**completed, "status": "failed", "output_file": "missing.md"}
        self.write_index([completed, failed])
        self.write_transcript(completed["output_file"])

        items, rejected = IMPORTER.load_completed_items(self.source, self.figures)

        self.assertEqual(len(items), 1)
        self.assertEqual(rejected, 0)

    def test_dry_run_does_not_create_files(self):
        row = self.completed_row()
        self.write_index([row])
        self.write_transcript(row["output_file"])

        summary = IMPORTER.import_transcripts(self.source, self.figures, dry_run=True)

        self.assertEqual(summary.copied, 1)
        self.assertFalse((self.figure / "transcripts").exists())

    def test_identical_destination_is_unchanged(self):
        row = self.completed_row()
        self.write_index([row])
        source_file = self.write_transcript(row["output_file"])
        destination = self.figure / "transcripts" / source_file.name
        destination.parent.mkdir()
        destination.write_text(source_file.read_text(encoding="utf-8"), encoding="utf-8")

        summary = IMPORTER.import_transcripts(self.source, self.figures)

        self.assertEqual(summary.unchanged, 1)
        self.assertEqual(summary.copied, 0)

    def test_differing_destination_conflicts_without_overwrite(self):
        row = self.completed_row()
        self.write_index([row])
        source_file = self.write_transcript(row["output_file"], "new\n")
        destination = self.figure / "transcripts" / source_file.name
        destination.parent.mkdir()
        destination.write_text("old\n", encoding="utf-8")

        summary = IMPORTER.import_transcripts(self.source, self.figures)

        self.assertEqual(summary.conflicting, 1)
        self.assertEqual(destination.read_text(encoding="utf-8"), "old\n")

    def test_overwrite_replaces_differing_destination(self):
        row = self.completed_row()
        self.write_index([row])
        source_file = self.write_transcript(row["output_file"], "new\n")
        destination = self.figure / "transcripts" / source_file.name
        destination.parent.mkdir()
        destination.write_text("old\n", encoding="utf-8")

        summary = IMPORTER.import_transcripts(self.source, self.figures, overwrite=True)

        self.assertEqual(summary.copied, 1)
        self.assertEqual(destination.read_text(encoding="utf-8"), "new\n")

    def test_path_traversal_is_rejected(self):
        row = self.completed_row("../outside.md")
        self.write_index([row])
        (self.root / "outside.md").write_text("outside\n", encoding="utf-8")

        items, rejected = IMPORTER.load_completed_items(self.source, self.figures)

        self.assertEqual(items, [])
        self.assertEqual(rejected, 1)

    def test_unknown_mapping_and_missing_source_are_rejected(self):
        unknown = {
            **self.completed_row(),
            "figure": "Unknown Figure",
        }
        missing = self.completed_row("missing.md")
        self.write_index([unknown, missing])

        items, rejected = IMPORTER.load_completed_items(self.source, self.figures)

        self.assertEqual(items, [])
        self.assertEqual(rejected, 2)


if __name__ == "__main__":
    unittest.main()
