#!/usr/bin/env python3
from pathlib import Path
import csv, urllib.request, time

root = Path(__file__).resolve().parent
out = root / "images"
out.mkdir(exist_ok=True)

with open(root / "catalog.csv", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))

for row in rows:
    ext = ".jpg"
    filename = f"{int(row['id']):02d}_{row['slug']}{ext}"
    target = out / filename
    if target.exists():
        print("exists", filename)
        continue
    try:
        req = urllib.request.Request(row["thumbnail_url"], headers={"User-Agent":"Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            target.write_bytes(r.read())
        print("saved", filename)
    except Exception as e:
        print("FAILED", filename, e)
    time.sleep(0.15)
