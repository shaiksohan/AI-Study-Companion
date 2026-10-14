"""Read text out of PDF files using pypdf."""

from pypdf import PdfReader


def extract_text_from_pdf(path):
    """Return (text, page_count) for the PDF at `path`."""
    reader = PdfReader(path)
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages), len(reader.pages)
