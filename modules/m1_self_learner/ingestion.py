# ============================================================
# modules/m1_self_learner/ingestion.py
# GENESIS M1 — Universal Ingestion Layer
#
# Handles ALL input types:
#   text, URL, PDF, YouTube (via MegaSaverBot + Whisper),
#   voice (Whisper), raw file
#
# Works on: Colab, local, Docker, cloud
# ============================================================

from __future__ import annotations

import hashlib
import os
import subprocess
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING, Optional

# ── optional heavy deps (graceful degradation) ──────────────
try:
    import whisper as _whisper
    _WHISPER_AVAILABLE = True
except ImportError:
    _WHISPER_AVAILABLE = False

try:
    import requests as _requests
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False

try:
    import PyPDF2 as _PyPDF2
    _PDF_AVAILABLE = True
except ImportError:
    try:
        import pypdf as _PyPDF2          # newer alias
        _PDF_AVAILABLE = True
    except ImportError:
        _PDF_AVAILABLE = False

if TYPE_CHECKING:
    from core.gemma_engine   import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


# ════════════════════════════════════════════════════════════
# 📥  Ingestion
# ════════════════════════════════════════════════════════════

class Ingestion:
    """
    Raw → clean text converter.
    Accepts: text str, URL, PDF path, audio file, video file.
    Returns a normalised plain-text string ready for extraction.
    """

    # ── whisper model (lazy-loaded once) ────────────────────
    _whisper_model = None

    @classmethod
    def _get_whisper(cls, model_size: str = "base"):
        if not _WHISPER_AVAILABLE:
            raise ImportError(
                "openai-whisper not installed. "
                "Run: pip install openai-whisper"
            )
        if cls._whisper_model is None:
            print(f"   ⏳ Loading Whisper ({model_size})...")
            cls._whisper_model = _whisper.load_model(model_size)
            print("   ✅ Whisper ready")
        return cls._whisper_model

    # ────────────────────────────────────────────────────────
    # PUBLIC — from_*
    # ────────────────────────────────────────────────────────

    @staticmethod
    def from_text(text: str) -> str:
        """Plain text passthrough with basic normalisation."""
        return text.strip()

    @staticmethod
    def from_url(url: str, max_chars: int = 8000) -> str:
        """Fetch webpage and return visible text."""
        if not _REQUESTS_AVAILABLE:
            raise ImportError("requests not installed. Run: pip install requests")
        try:
            resp = _requests.get(url, timeout=15,
                                 headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            # Strip HTML tags cheaply (no BS4 required)
            import re
            text = re.sub(r"<[^>]+>", " ", resp.text)
            text = re.sub(r"\s+", " ", text)
            return text[:max_chars].strip()
        except Exception as e:
            raise RuntimeError(f"URL fetch failed: {e}") from e

    @staticmethod
    def from_pdf(pdf_path: str, max_chars: int = 12000) -> str:
        """Extract text from a PDF file."""
        if not _PDF_AVAILABLE:
            raise ImportError(
                "PDF library not installed. "
                "Run: pip install pypdf2  OR  pip install pypdf"
            )
        path = Path(pdf_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")
        text = ""
        try:
            with open(path, "rb") as f:
                reader = _PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += (page.extract_text() or "") + "\n"
        except Exception as e:
            raise RuntimeError(f"PDF read failed: {e}") from e
        return text[:max_chars].strip()

    @classmethod
    def from_audio(
        cls,
        audio_path: str,
        whisper_size: str = "base",
        translate_hindi: bool = True,
    ) -> dict:
        """
        Transcribe audio with Whisper.
        Returns:
            {
              "text":     str,          # original transcript
              "language": str,          # detected language code
              "english":  str | None,   # English translation if Hindi
              "combined": str,          # merged text ready for M1
            }
        """
        model = cls._get_whisper(whisper_size)

        # Convert to 16kHz mono WAV (Whisper prefers this)
        wav_path = audio_path + "_16k.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-i", audio_path,
             "-ar", "16000", "-ac", "1", wav_path],
            capture_output=True, check=False
        )
        work = wav_path if os.path.exists(wav_path) else audio_path

        print("   🧠 Whisper transcribing...")
        result   = model.transcribe(work, task="transcribe", verbose=False)
        text     = result["text"].strip()
        language = result.get("language", "unknown")

        english = None
        if translate_hindi and language == "hi":
            print("   🔄 Hindi → translating to English...")
            tr      = model.transcribe(work, task="translate", verbose=False)
            english = tr["text"].strip()

        # Cleanup temp wav
        if os.path.exists(wav_path):
            try: os.remove(wav_path)
            except: pass

        combined = text
        if english:
            combined = (
                f"[HINDI ORIGINAL]\n{text}\n\n"
                f"[ENGLISH TRANSLATION]\n{english}"
            )

        return {
            "text":     text,
            "language": language,
            "english":  english,
            "combined": combined,
        }

    @classmethod
    def from_video_frames(
        cls,
        video_path: str,
        interval_sec: int = 5,
        max_frames: int = 40,
    ) -> list[dict]:
        """
        Extract frames from a video file using ffmpeg.
        Returns list of: {"path": str, "timestamp": int, "time_label": str}
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found: {video_path}")

        frames_dir = tempfile.mkdtemp(prefix="genesis_frames_")
        out_pattern = os.path.join(frames_dir, "frame_%04d.jpg")

        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path,
             "-vf", f"fps=1/{interval_sec}",
             "-vframes", str(max_frames),
             "-q:v", "2", out_pattern],
            capture_output=True, check=False
        )

        frames = []
        for i, fname in enumerate(sorted(os.listdir(frames_dir))):
            if fname.endswith(".jpg"):
                ts = i * interval_sec
                m, s = divmod(ts, 60)
                frames.append({
                    "path":       os.path.join(frames_dir, fname),
                    "timestamp":  ts,
                    "time_label": f"{m:02d}:{s:02d}",
                })

        print(f"   🖼️  Extracted {len(frames)} frames (every {interval_sec}s)")
        return frames

    @staticmethod
    def from_file(file_path: str, max_chars: int = 12000) -> str:
        """
        Generic file reader — tries to detect type from extension.
        Supports: .txt, .md, .py, .js, .json, .csv, .pdf
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = path.suffix.lower()

        if ext == ".pdf":
            return Ingestion.from_pdf(file_path, max_chars)

        # text-readable formats
        text_exts = {".txt", ".md", ".py", ".js", ".ts", ".json",
                     ".csv", ".yaml", ".yml", ".html", ".xml"}
        if ext in text_exts or ext == "":
            try:
                return path.read_text(encoding="utf-8",
                                      errors="replace")[:max_chars].strip()
            except Exception as e:
                raise RuntimeError(f"File read failed: {e}") from e

        raise ValueError(
            f"Unsupported file type '{ext}'. "
            f"Supported: {sorted(text_exts | {'.pdf'})}"
        )

    # ────────────────────────────────────────────────────────
    # UTIL — doc_id from content
    # ────────────────────────────────────────────────────────

    @staticmethod
    def make_doc_id(text: str, prefix: str = "") -> str:
        """Stable SHA-256 based doc ID from content."""
        h = hashlib.sha256(text[:500].encode()).hexdigest()[:16]
        return f"{prefix}{h}" if prefix else h
