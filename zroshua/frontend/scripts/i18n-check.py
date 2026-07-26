#!/usr/bin/env python3
"""Report translation keys used in the UI but missing from each locale dictionary.

Usage: python3 scripts/i18n-check.py [lang ...]     (run from the frontend directory)
"""
import glob
import json
import os
import re
import sys

KEY_CALL = re.compile(r"\b[tT]\(\s*'((?:[^'\\]|\\.)*)'")
DICT_KEY = re.compile(
    r"^\s{2}(?:'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"|([A-Za-z][A-Za-z0-9 ]*)):", re.M
)
# keys built at runtime from data, not literals in the source
DYNAMIC = {'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'}


def used_keys() -> set:
    keys = set(DYNAMIC)
    for path in glob.glob('src/**/*.ts*', recursive=True):
        if '/locales/' in path:
            continue
        for m in KEY_CALL.finditer(open(path).read()):
            keys.add(m.group(1).replace("\\'", "'"))
    return keys


def dict_keys(path: str) -> set:
    have = set()
    for m in DICT_KEY.finditer(open(path).read()):
        key = m.group(1) or m.group(2) or m.group(3)
        have.add(key.replace("\\'", "'").replace('\\"', '"'))
    return have


def main() -> int:
    wanted = sys.argv[1:]
    keys = used_keys()
    report = {}
    failed = False
    for path in sorted(glob.glob('src/locales/*.ts')):
        lang = os.path.basename(path)[:-3]
        if wanted and lang not in wanted:
            continue
        missing = sorted(keys - dict_keys(path))
        report[lang] = missing
        failed = failed or bool(missing)
        print(f'{lang}: missing {len(missing)}', missing[:5])
    json.dump(report, open('/tmp/missing_all.json', 'w'), ensure_ascii=False, indent=1)
    print(f'{len(keys)} keys used; full report written to /tmp/missing_all.json')
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
