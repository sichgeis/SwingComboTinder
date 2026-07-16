#!/usr/bin/env python3
"""Import completed tutorial transcripts into their figure packages."""

from __future__ import annotations

import argparse
import csv
import filecmp
import os
import shutil
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


FIGURE_DIRECTORIES: dict[tuple[str, str], str] = {
    ("Charleston", "Charleston Kick-Throughs"): "charleston/kick-throughs",
    ("Charleston", "Charleston Tuck Turn"): "charleston/charleston-tuck-turn",
    ("Charleston", "Hand-to-Hand Charleston"): "charleston/hand-to-hand",
    ("Charleston", "Side-by-Side Charleston"): "charleston/side-charleston",
    ("Charleston", "Tandem Charleston"): "charleston/tandem-charleston",
    ("Charleston", "Tandem Rainbow"): "charleston/tandem-rainbow",
    ("Lindy Hop", "Barrel Roll"): "lindy/barrel-roll",
    ("Lindy Hop", "Boogie Forward / Back"): "lindy/boogie",
    ("Lindy Hop", "Bring In"): "lindy/bring-in",
    ("Lindy Hop", "Double Turn"): "lindy/double-turn",
    ("Lindy Hop", "Free Spin"): "lindy/free-spin",
    ("Lindy Hop", "Groove Walk"): "lindy/groove-walk",
    ("Lindy Hop", "Inside Turn"): "lindy/inside-turn",
    ("Lindy Hop", "Lindy Circle"): "lindy/lindy-circle",
    ("Lindy Hop", "Outside Turn"): "lindy/outside-turn",
    ("Lindy Hop", "Pass By"): "lindy/pass-by",
    ("Lindy Hop", "Promenade"): "lindy/promenade",
    ("Lindy Hop", "Send Out"): "lindy/send-out",
    ("Lindy Hop", "Shoulder Pass"): "lindy/shoulder-pass",
    ("Lindy Hop", "Side Pass"): "lindy/side-pass",
    ("Lindy Hop", "Sliding Door"): "lindy/schiebetuer",
    ("Lindy Hop", "Stop & Go"): "lindy/stop-and-go",
    ("Lindy Hop", "Sugar Push"): "lindy/sugar-push",
    ("Lindy Hop", "Sweetheart"): "lindy/sweetheart",
    ("Lindy Hop", "Sweetheart Side Change"): "lindy/sweetheart-side-change",
    ("Lindy Hop", "Swingout + Inside Turn"): "lindy/swingout-inside",
    ("Lindy Hop", "Swingout + Outside Turn"): "lindy/swingout-outside",
    ("Lindy Hop", "Swingout from Closed"): "lindy/swingout-closed",
    ("Lindy Hop", "Swingout from Open"): "lindy/swingout-open",
    ("Lindy Hop", "Swingout to Closed"): "lindy/swingout-closed-end",
    ("Lindy Hop", "Texas Tommy"): "lindy/texas-tommy",
    ("Lindy Hop", "Traveling Tuck"): "lindy/traveling-tuck",
    ("Lindy Hop", "Tuck Turn"): "lindy/tuck-turn",
    ("Lindy Hop", "Underarm Turn"): "lindy/underarm-turn",
    ("Collegiate Shag", "Camel Hops"): "shag/camel-hops",
    ("Collegiate Shag", "Closed Shag Turn"): "shag/shag-closed-turn",
    ("Collegiate Shag", "Collegiate Kicks"): "shag/collegiate-kicks",
    ("Collegiate Shag", "Cross Kicks"): "shag/cross-kicks",
    ("Collegiate Shag", "Shag Breaks"): "shag/shag-breaks",
    ("Collegiate Shag", "Shag Pass-By Turn"): "shag/shag-pass-by",
    ("Collegiate Shag", "Shag Texas Tommy"): "shag/shag-texas-tommy",
    ("Collegiate Shag", "Shag Tuck Turn"): "shag/shag-tuck-turn",
}

REQUIRED_INDEX_FIELDS = {"dance", "figure", "status", "output_file"}


@dataclass
class ImportSummary:
    mapped: int = 0
    copied: int = 0
    unchanged: int = 0
    conflicting: int = 0
    rejected: int = 0
    destination_figures: int = 0


@dataclass(frozen=True)
class ImportItem:
    source: Path
    destination: Path
    figure_directory: Path


def is_within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def load_completed_items(source_root: Path, figures_root: Path) -> tuple[list[ImportItem], int]:
    source_root = source_root.resolve()
    figures_root = figures_root.resolve()
    index_path = source_root / "index.csv"
    if not index_path.is_file():
        raise ValueError(f"Missing transcript index: {index_path}")

    items: list[ImportItem] = []
    rejected = 0
    destinations: set[Path] = set()
    with index_path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing_fields = REQUIRED_INDEX_FIELDS - set(reader.fieldnames or ())
        if missing_fields:
            raise ValueError(
                f"Transcript index is missing required fields: {', '.join(sorted(missing_fields))}"
            )
        for row_number, row in enumerate(reader, start=2):
            if row["status"] != "completed":
                continue
            mapping = FIGURE_DIRECTORIES.get((row["dance"], row["figure"]))
            if mapping is None:
                print(
                    f"REJECT row {row_number}: no mapping for "
                    f"{row['dance']} / {row['figure']}",
                    file=sys.stderr,
                )
                rejected += 1
                continue

            figure_directory = (figures_root / mapping).resolve()
            if not is_within(figure_directory, figures_root) or not figure_directory.is_dir():
                print(
                    f"REJECT row {row_number}: missing figure directory {figure_directory}",
                    file=sys.stderr,
                )
                rejected += 1
                continue

            relative_source = Path(row["output_file"])
            source_file = (source_root / relative_source).resolve()
            if (
                not row["output_file"]
                or relative_source.is_absolute()
                or not is_within(source_file, source_root)
                or not source_file.is_file()
                or source_file.suffix.lower() != ".md"
            ):
                print(
                    f"REJECT row {row_number}: invalid transcript file {row['output_file']!r}",
                    file=sys.stderr,
                )
                rejected += 1
                continue

            destination = figure_directory / "transcripts" / source_file.name
            if destination in destinations:
                print(
                    f"REJECT row {row_number}: duplicate destination {destination}",
                    file=sys.stderr,
                )
                rejected += 1
                continue
            destinations.add(destination)
            items.append(ImportItem(source_file, destination, figure_directory))
    return items, rejected


def atomic_copy(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=destination.parent,
        prefix=f".{destination.name}.",
        suffix=".tmp",
    )
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        shutil.copy2(source, temporary)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def import_transcripts(
    source_root: Path,
    figures_root: Path,
    *,
    dry_run: bool = False,
    overwrite: bool = False,
) -> ImportSummary:
    items, rejected = load_completed_items(source_root, figures_root)
    summary = ImportSummary(mapped=len(items), rejected=rejected)
    summary.destination_figures = len({item.figure_directory for item in items})

    for item in items:
        if item.destination.exists():
            if filecmp.cmp(item.source, item.destination, shallow=False):
                summary.unchanged += 1
                continue
            if not overwrite:
                print(f"CONFLICT {item.destination}", file=sys.stderr)
                summary.conflicting += 1
                continue
        if dry_run:
            summary.copied += 1
            continue
        atomic_copy(item.source, item.destination)
        summary.copied += 1
    return summary


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(
        description="Copy completed swing tutorial transcripts into figure packages."
    )
    result.add_argument("--source", required=True, type=Path, help="Transcript output directory")
    result.add_argument(
        "--figures",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "figures",
        help="SwingComboTinder figures directory",
    )
    result.add_argument("--dry-run", action="store_true", help="Plan without writing files")
    result.add_argument("--overwrite", action="store_true", help="Replace differing transcripts")
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        summary = import_transcripts(
            args.source,
            args.figures,
            dry_run=args.dry_run,
            overwrite=args.overwrite,
        )
    except (OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2

    print(f"Mapped: {summary.mapped}")
    print(f"Destination figures: {summary.destination_figures}")
    print(f"{'Would copy' if args.dry_run else 'Copied'}: {summary.copied}")
    print(f"Unchanged: {summary.unchanged}")
    print(f"Conflicting: {summary.conflicting}")
    print(f"Rejected: {summary.rejected}")
    return 1 if summary.conflicting or summary.rejected else 0


if __name__ == "__main__":
    raise SystemExit(main())
