"""PDF generation for tailored resumes and cover letters.

Uses WeasyPrint to render Markdown → HTML → PDF with professional styling.
Falls back to basic HTML if WeasyPrint is not available (e.g., missing system deps).
"""

import logging
import os
import re

from app.config import settings

logger = logging.getLogger(__name__)


def _markdown_to_html(markdown_text: str) -> str:
    """Convert basic Markdown to HTML (lightweight, no external deps)."""
    html = markdown_text

    # Headers
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)

    # Bold and italic
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)

    # Bullet lists
    lines = html.split('\n')
    result_lines = []
    in_list = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('- ') or stripped.startswith('• '):
            if not in_list:
                result_lines.append('<ul>')
                in_list = True
            result_lines.append(f'<li>{stripped[2:]}</li>')
        else:
            if in_list:
                result_lines.append('</ul>')
                in_list = False
            if stripped and not stripped.startswith('<'):
                result_lines.append(f'<p>{stripped}</p>')
            else:
                result_lines.append(line)
    if in_list:
        result_lines.append('</ul>')

    html = '\n'.join(result_lines)

    # Horizontal rules
    html = re.sub(r'^---+$', '<hr>', html, flags=re.MULTILINE)

    return html


RESUME_CSS = """
@page { size: A4; margin: 1.5cm; }
body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    max-width: 100%;
}
h1 {
    font-size: 18pt;
    color: #0f172a;
    margin-bottom: 4px;
    border-bottom: 2px solid #3b82f6;
    padding-bottom: 6px;
}
h2 {
    font-size: 13pt;
    color: #1e40af;
    margin-top: 14px;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 3px;
}
h3 {
    font-size: 11pt;
    color: #334155;
    margin-top: 8px;
    margin-bottom: 4px;
}
p {
    margin: 4px 0;
}
ul {
    margin: 4px 0;
    padding-left: 20px;
}
li {
    margin: 2px 0;
}
hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 10px 0;
}
strong { color: #0f172a; }
"""

COVER_LETTER_CSS = """
@page { size: A4; margin: 2.5cm; }
body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #1a1a1a;
    max-width: 100%;
}
h1 {
    font-size: 16pt;
    color: #0f172a;
    margin-bottom: 20px;
}
p {
    margin: 12px 0;
    text-align: justify;
}
strong { color: #0f172a; }
"""


def generate_resume_pdf(markdown_content: str, batch_id: str, app_id: str) -> str:
    """Generate a PDF from tailored resume Markdown content."""
    return _generate_pdf(markdown_content, RESUME_CSS, f"resume_{batch_id}_{app_id}.pdf")


def generate_cover_letter_pdf(markdown_content: str, batch_id: str, app_id: str) -> str:
    """Generate a PDF from cover letter Markdown content."""
    return _generate_pdf(markdown_content, COVER_LETTER_CSS, f"cover_letter_{batch_id}_{app_id}.pdf")


def _generate_pdf(markdown_content: str, css: str, filename: str) -> str:
    """Generate a PDF from Markdown content with given CSS styling."""
    os.makedirs(settings.pdf_output_dir, exist_ok=True)
    output_path = os.path.join(settings.pdf_output_dir, filename)

    html_body = _markdown_to_html(markdown_content)
    full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>{css}</style>
</head>
<body>
{html_body}
</body>
</html>"""

    try:
        from weasyprint import HTML
        HTML(string=full_html).write_pdf(output_path)
        logger.info(f"Generated PDF: {output_path}")
    except ImportError:
        # WeasyPrint not available — save as HTML fallback
        output_path = output_path.replace(".pdf", ".html")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_html)
        logger.warning(f"WeasyPrint not available, saved as HTML: {output_path}")
    except Exception as e:
        # WeasyPrint system dependency error — save as HTML fallback
        output_path = output_path.replace(".pdf", ".html")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(full_html)
        logger.warning(f"PDF generation failed ({e}), saved as HTML: {output_path}")

    return output_path
