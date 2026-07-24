#!/usr/bin/env python3
"""Fail if any article's canonical / og:url / mainEntityOfPage disagree with its
resources.json slug. resources.json is the source of truth for resource URLs.

Usage:  python3 _check-slugs.py    (exit 0 = all aligned, 1 = drift found)
"""
import re, os, json, sys

BASE = os.path.dirname(os.path.abspath(__file__))
PROD = "https://rightbrain.ai"

def field(c, pat):
    m = re.search(pat, c)
    return m.group(1) if m else None

doc = json.load(open(os.path.join(BASE, "resources.json")))
problems = []
for e in doc["resources"]:
    href, slug = e["href"], e["slug"]
    expected = f"{PROD}/resources/{slug}"
    p = os.path.join(BASE, href)
    if not os.path.exists(p):
        problems.append(f"{href}: file missing"); continue
    c = open(p, encoding="utf-8", errors="ignore").read()
    got = {
        "canonical": field(c, r'<link rel="canonical" href="([^"]*)"'),
        "og:url": field(c, r'<meta property="og:url" content="([^"]*)"'),
        "mainEntityOfPage": field(c, r'"mainEntityOfPage":\s*"([^"]*)"'),
    }
    for k, v in got.items():
        if v != expected:
            problems.append(f"{href}: {k}={v!r} != resources.json slug -> {expected!r}")

if problems:
    print("SLUG DRIFT:\n  " + "\n  ".join(problems)); sys.exit(1)
print(f"OK: {len(doc['resources'])} articles - canonical/og:url/mainEntityOfPage all match resources.json slugs")
