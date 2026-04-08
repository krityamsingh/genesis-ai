# data/pipeline/preprocessor.py
from __future__ import annotations
import re, unicodedata


def normalise(text: str) -> str:
    """Unicode normalise + collapse whitespace."""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def remove_boilerplate(text: str) -> str:
    """Strip common web boilerplate patterns."""
    patterns = [
        r"cookie policy.*?accept",
        r"subscribe to our newsletter.*?\n",
        r"©\s*\d{4}.*?\n",
        r"all rights reserved.*?\n",
    ]
    for p in patterns:
        text = re.sub(p, "", text, flags=re.IGNORECASE | re.DOTALL)
    return text.strip()


def clean_html(text: str) -> str:
    """Remove residual HTML tags."""
    return re.sub(r"<[^>]+>", " ", text)


def preprocess(text: str) -> str:
    """Full preprocessing pipeline."""
    text = clean_html(text)
    text = remove_boilerplate(text)
    return normalise(text)
