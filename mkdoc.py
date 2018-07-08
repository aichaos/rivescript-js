#!/usr/bin/env python3

"""Generate documentation from the RiveScript source files."""

import os
import os.path
import markdown

def main():
    # Scan for JavaScript modules.
    modules = []
    for path, dirs, files in os.walk("src"):
        for f in files:
            module = os.path.join(path, f) \
                .replace("src/", "") \
                .replace(".js", "") \
                .replace("/", ".")
            modules.append(dict(
                name=module,
                path=os.path.join(path, f),
            ))

    # Read their documentation.
    for mod in modules:
        md = []  # Markdown output, in sections
        in_doc = False
        buf = []
        fh = open(mod["path"], "r")
        indent = 0
        for line in fh:
            stripped = line.strip()
            if stripped.startswith("/**") and not in_doc:
                in_doc = True
                indent = line.index("/**")
                continue
            elif stripped.startswith("*/") and in_doc:
                in_doc = False
                md.append(to_markdown(buf))
                buf = []
                continue

            if in_doc:
                line = line[indent:].rstrip()
                buf.append(line)
        fh.close()

        # Write the Markdown file.
        print("Write docs for module: {}".format(mod["name"]))
        fh = open("docs/{}.md".format(mod["name"]), "w")
        fh.write("\n\n".join(md))
        fh.close()

        # Render the HTML from the Markdown.
        render_markdown(
            mod["name"],
            "docs/html/{}.html".format(mod["name"]),
            "\n\n".join(md)
        )


def to_markdown(buf):
    """Convert documentation data to markdown."""
    output = []

    # Consolodate the header.
    header = []
    while len(buf) > 0 and buf[0].strip():
        header.append(buf.pop(0).strip())

    # Headers that aren't functions are always shown as H1.
    function_types = ["string", "void", "data", "private", "object", "int",
        "bool", "Promise", "[]string", "async"]
    is_function = False
    for t in function_types:
        if header[0].startswith(t):
            is_function = True
            break

    if not is_function:
        output.append("# {}".format(" ".join(header)))
    else:
        output.append("## {}".format(" ".join(header)))

    for line in buf:
        output.append(line)

    return "\n".join(output).strip()


def render_markdown(title, path, text):
    """Render Markdown to HTML."""
    fh = open(path, "w")

    # HTML header.
    fh.write("""<!DOCTYPE html>
<html>
<head>
<title>{title}</title>
<link rel="stylesheet" type="text/css" href="md.css">
</head>
<body>

{text}

</body>
</html>""".format(
        title=title,
        text=markdown.markdown(text,
            extensions=[
                "fenced_code",
                "smart_strong",
                "codehilite",
                "sane_lists",
            ],
            safe_mode="escape",
        ),
    ))

    fh.close()


if __name__ == "__main__":
    main()
