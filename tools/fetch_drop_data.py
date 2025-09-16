#!/usr/bin/env python3
"""
fetch_drop_data.py
====================

This script reproduces the data export used by WFCD for their public drop tables
(https://drops.warframestat.us/).  The goal is to give you full autonomy over
the drop‐rate dataset so you don't need to rely on third‑party services.

How it works
------------
Digital Extremes publishes an official drop rate page as an HTML document
containing multiple tables (missions, relics, bounty rewards, etc.).  This
script fetches that page, parses all rows in the tables, and outputs a
consolidated JSON file in a "slim" format similar to the `all.slim.json` file
produced by WFCD.  Each record in the output contains:

* ``location`` – the mission node, relic name, or source of the drop
* ``item`` – the name of the item that can drop
* ``rarity`` – common/uncommon/rare/ultra‐rare (when provided)
* ``chance`` – the chance as a percentage string (e.g. ``5.64%``)

The script can be run periodically (e.g. in a GitHub Actions workflow) to
regenerate the drop data whenever Digital Extremes updates their tables.  The
resulting file can then be merged with your other datasets or served via
your own API.

Usage:

    python tools/fetch_drop_data.py --output data/drop_data.slim.json

If you want to save the full HTML for debugging, you can pass ``--html``
with a path; the script will write the raw HTML there.

Note: You need the ``requests`` and ``beautifulsoup4`` packages installed.  If
you're running this in a GitHub Actions environment, add ``pip install -r
requirements.txt`` to your workflow and include ``beautifulsoup4`` in
``requirements.txt``.
"""

import argparse
import json
import re
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Official drop table URL.  Digital Extremes hosts this asset on their CDN.
DROP_TABLE_URL = (
    "https://warframe-web-assets.nyc3.cdn.digitaloceanspaces.com/drops/drops.html"
)

def fetch_html(url: str) -> bytes:
    """Download the HTML page containing the drop tables.

    Raises an exception if the request fails or returns a non‑200 status.
    """
    headers = {
        "User-Agent": "Cephalon-Wodan-DropFetcher/1.0 (+https://github.com/)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    response = requests.get(url, headers=headers, timeout=60)
    response.raise_for_status()
    return response.content

def parse_drop_tables(html: bytes) -> list[dict[str, str]]:
    """Parse all drop tables from the HTML and return a list of slim records.

    The resulting list contains one dictionary per drop entry with the keys
    ``location``, ``item``, ``rarity`` (may be empty), and ``chance``.
    """
    soup = BeautifulSoup(html, "html.parser")
    records: list[dict[str, str]] = []

    # The drop page contains multiple sections, each with its own table.  We
    # iterate over all tables with a <thead> for headings and <tbody> for rows.
    tables = soup.find_all("table")
    for table in tables:
        # Find all rows in the body.  Skip tables without body.
        tbody = table.find("tbody")
        if not tbody:
            continue
        for row in tbody.find_all("tr"):
            cells = [c.get_text(strip=True) for c in row.find_all(["th", "td"])]
            if not cells:
                continue
            # Many tables have 4 columns: location, item, rarity, chance.
            # Some may omit the rarity column; handle variable lengths.
            # We'll map the last column to chance and fill missing fields with empty strings.
            if len(cells) == 4:
                location, item, rarity, chance = cells
            elif len(cells) == 3:
                location, item, chance = cells
                rarity = ""
            else:
                # Unexpected number of columns; skip the row or handle gracefully.
                # We'll attempt to map the first and last cells and join the rest as item.
                location = cells[0]
                chance = cells[-1]
                # Assume the second cell (or combined) is the item; ignore rarity.
                item = " ".join(cells[1:-1])
                rarity = ""
            # Normalise whitespace and percentage formatting.
            chance = chance.replace("%", "").strip()
            if chance:
                # Convert to decimal percentage with a % sign for readability.
                # Some cells might include text like "5.64%" or "Uncommon 3.33%".
                # Extract the numeric portion using regex.
                m = re.search(r"([0-9]*\.?[0-9]+)", chance)
                chance_value = m.group(1) if m else chance
                chance = f"{chance_value}%"
            records.append({
                "location": location,
                "item": item,
                "rarity": rarity,
                "chance": chance,
            })
    return records

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch and parse Warframe drop tables.")
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("data/drop_data.slim.json"),
        help="Path to write the slim JSON file (default: data/drop_data.slim.json)",
    )
    parser.add_argument(
        "--html",
        type=Path,
        default=None,
        help="Optional path to save the raw HTML of the drop tables.",
    )
    args = parser.parse_args(argv)

    print(f"Fetching drop tables from {DROP_TABLE_URL}…")
    html = fetch_html(DROP_TABLE_URL)
    if args.html:
        args.html.parent.mkdir(parents=True, exist_ok=True)
        args.html.write_bytes(html)
        print(f"Saved raw HTML to {args.html}")

    print("Parsing tables…")
    data = parse_drop_tables(html)
    print(f"Parsed {len(data)} drop entries.")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Wrote slim drop data to {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
