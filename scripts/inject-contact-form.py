#!/usr/bin/env python3
"""Wire the contact form of an exported Novum site bundle to Supabase.

Usage:
  python3 scripts/inject-contact-form.py path/to/index.html --ref YOUR_PROJECT_REF

Inserts site/contact-form.js (with the endpoint filled in) before </body> of
the bundle's page template. Safe to re-run: a previous injection is replaced.
Run it again every time the site is re-exported from the design tool.
"""
import argparse
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OPEN_TAG = '<script type="__bundler/template">'
START, END = "<!-- novum-contact-form -->", "<!-- /novum-contact-form -->"


def encode(fragment: str) -> str:
    # Same escaping as the bundler: JSON string body with "/" as / so
    # "</script>" can never close the outer tag.
    return json.dumps(fragment, ensure_ascii=False)[1:-1].replace("/", "\\u002F")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("bundle")
    ap.add_argument("--ref", required=True, help="Supabase project ref, e.g. abcd1234efgh5678")
    args = ap.parse_args()

    path = pathlib.Path(args.bundle)
    html = path.read_text(encoding="utf-8")
    js = (ROOT / "site" / "contact-form.js").read_text(encoding="utf-8")
    js = js.replace("YOUR_PROJECT_REF", args.ref)
    snippet = f"{START}<script>\n{js}</script>{END}\n"

    start = html.index(OPEN_TAG) + len(OPEN_TAG)
    end = html.index("</script>", start)
    template = html[start:end]

    template = re.sub(re.escape(encode(START)) + ".*?" + re.escape(encode(END)) + re.escape(encode("\n")),
                      "", template, flags=re.S)
    body_close = encode("</body>")
    at = template.rindex(body_close)
    template = template[:at] + encode(snippet) + template[at:]

    json.loads(template)  # still a valid JSON string
    path.write_text(html[:start] + template + html[end:], encoding="utf-8")
    print(f"Injected contact form handler into {path} (endpoint ref: {args.ref})")


if __name__ == "__main__":
    main()
