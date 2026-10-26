#!/usr/bin/env python3
"""Replace the World English Bible copyright footer in local HTML pages."""

import argparse
import re
from pathlib import Path


FOOTER = re.compile(
    r'(?P<open><div\s+class=["\']copyright["\']\s*>)(?P<body>.*?)(?P<close></div>)',
    re.IGNORECASE | re.DOTALL,
)
NOTICE = "This is the updated World English Bible"
MISSPELLED_REPLACEMENT = "Word English Bible"
REPLACEMENT = "\n<center>World English Bible</center>\n"


def replace_footer(content: str) -> tuple[str, bool]:
    replaced = False

    def replace_block(match: re.Match[str]) -> str:
        nonlocal replaced
        if NOTICE not in match.group("body") and MISSPELLED_REPLACEMENT not in match.group("body"):
            return match.group(0)
        replaced = True
        return f'{match.group("open")}{REPLACEMENT}{match.group("close")}'

    return FOOTER.sub(replace_block, content), replaced


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "directory",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="folder containing .htm/.html pages (default: this script's folder)",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="write replacements; without this flag, only report what would change",
    )
    args = parser.parse_args()

    pages = sorted((*args.directory.glob("*.htm"), *args.directory.glob("*.html")))
    changed = []
    for page in pages:
        with page.open("r", encoding="utf-8", newline="") as source:
            content = source.read()
        updated, replaced = replace_footer(content)
        if replaced:
            changed.append(page)
            if args.apply:
                with page.open("w", encoding="utf-8", newline="") as destination:
                    destination.write(updated)

    action = "Updated" if args.apply else "Would update"
    print(f"{action} {len(changed)} of {len(pages)} HTML pages.")
    if not args.apply:
        print("Run with --apply to write the replacements.")


if __name__ == "__main__":
    main()