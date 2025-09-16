#!/usr/bin/env python3
import argparse, lzma, urllib.request, pathlib, sys

ORIGIN_INDEX = "https://origin.warframe.com/PublicExport/index_{lang}.txt.lzma"
CONTENT_ROOT = "http://content.warframe.com/PublicExport/Manifest/"

ASSETS = {
    # what → basename template in the index
    "companions":   "ExportSentinels_{lang}.json",
    "warframes":    "ExportWarframes_{lang}.json",
    "weapons":      "ExportWeapons_{lang}.json",
    "upgrades":     "ExportUpgrades_{lang}.json",
    "relicarcanes": "ExportRelicArcane_{lang}.json",
    "resources":    "ExportResources_{lang}.json",
    "customs":      "ExportCustoms_{lang}.json",
    "gear":         "ExportGear_{lang}.json",
    "regions":      "ExportRegions_{lang}.json",
    "recipes":      "ExportRecipes_{lang}.json",
    "flavour":      "ExportFlavour_{lang}.json",
    "sortierewards":"ExportSortieRewards_{lang}.json",
}

def http_get(url: str) -> bytes:
    with urllib.request.urlopen(url) as r:
        return r.read()

def fetch_index(lang: str) -> str:
    raw = http_get(ORIGIN_INDEX.format(lang=lang))
    try:
        txt = lzma.decompress(raw).decode("utf-8", "replace")
    except lzma.LZMAError as e:
        sys.exit(f"Failed to decompress index: {e}")
    return txt

def find_hashed_url(index_txt: str, asset_basename: str) -> str:
    target_prefix = asset_basename + "!"
    for line in index_txt.splitlines():
        if line.startswith(target_prefix):
            return CONTENT_ROOT + line.strip()
    raise SystemExit(f"Asset not found in index: {asset_basename}")

def save(url: str, out_path: pathlib.Path):
    data = http_get(url)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(data)
    print(f"✓ Saved {out_path} ({len(data):,} bytes)")

def main():
    p = argparse.ArgumentParser(description="Fetch Warframe Public Export JSONs")
    p.add_argument("what", nargs="+", help="what to fetch (e.g. companions) or 'all'")
    p.add_argument("-l", "--lang", default="en", help="language code (default: en)")
    p.add_argument("-o", "--out", default=".", help="output directory")
    args = p.parse_args()

    want = list(ASSETS.keys()) if "all" in args.what else args.what
    unknown = [w for w in want if w not in ASSETS]
    if unknown:
        sys.exit(f"Unknown asset key(s): {', '.join(unknown)}\nValid: {', '.join(ASSETS)}")

    index_txt = fetch_index(args.lang)

    out_dir = pathlib.Path(args.out)
    for key in want:
        basename = ASSETS[key].format(lang=args.lang)
        url = find_hashed_url(index_txt, basename)
        # keep hashed filename to benefit from eternal caching
        fname = url.rsplit("/", 1)[1]
        save(url, out_dir / fname)

if __name__ == "__main__":
    main()
