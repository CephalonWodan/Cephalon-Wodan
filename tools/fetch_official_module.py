#!/usr/bin/env python3
import argparse, urllib.request, urllib.parse, time, random, pathlib, sys, html, xml.etree.ElementTree as ET, re

BASE="https://wiki.warframe.com"
HEADERS={
  "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36 Cephalon-Wodan/1.0",
  "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language":"en-US,en;q=0.8",
  "Referer":"https://wiki.warframe.com/"
}

def http_get(url, timeout=25, retries=4):
  for i in range(retries):
    try:
      req = urllib.request.Request(url, headers=HEADERS)
      with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.getcode(), r.read()
    except Exception:
      if i == retries-1: raise
      time.sleep(0.6 + i*0.7 + random.random()*0.4)

def fetch_export(title:str):
  page = urllib.parse.quote(title, safe="")
  url  = f"{BASE}/wiki/Special:Export/{page}"
  code, data = http_get(url)
  root = ET.fromstring(data)
  text = root.find(".//{http://www.mediawiki.org/xml/export-0.10/}text")
  if text is not None and text.text:
    return text.text.encode("utf-8")

def fetch_raw(title:str):
  q = urllib.parse.urlencode({"title": title, "action":"raw", "ctype":"text/plain"})
  url = f"{BASE}/w/index.php?{q}"
  try:
    code, data = http_get(url)
    if code == 200 and data: return data
  except Exception:
    pass

def fetch_edit(title:str):
  q = urllib.parse.urlencode({"title": title, "action":"edit"})
  url = f"{BASE}/w/index.php?{q}"
  code, data = http_get(url)
  if code == 200 and data:
    m = re.search(r'<textarea[^>]*id=["\']wpTextbox1["\'][^>]*>([\s\S]*?)</textarea>', data.decode('utf-8','replace'), re.I)
    if m:
      return html.unescape(m.group(1)).encode("utf-8")

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument("--title", required=True)   # e.g. Module:Warframes/data
  ap.add_argument("--out",   required=True)   # path to .lua
  args = ap.parse_args()

  out = pathlib.Path(args.out)
  out.parent.mkdir(parents=True, exist_ok=True)

  data = fetch_export(args.title) or fetch_raw(args.title) or fetch_edit(args.title)
  if not data:
    print(f"[ERR] Unable to fetch {args.title}", file=sys.stderr)
    sys.exit(2)

  out.write_bytes(data)
  print(f"✓ Saved {args.title} -> {out} ({len(data)} bytes)")

if __name__ == "__main__":
  main()
