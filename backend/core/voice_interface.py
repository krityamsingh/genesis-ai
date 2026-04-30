# ============================================================
# core/voice_interface.py
# GENESIS — Voice Interface
#
# Text-to-speech (TTS) and speech-to-text (STT) layer.
# Uses gTTS for TTS and Whisper (via M1 Ingestion) for STT.
# All dependencies are optional — graceful degradation.
#
# Usage:
#   voice = VoiceInterface()
#   audio_path = voice.speak("Hello, I am GENESIS.")    # TTS -> .mp3
#   text = voice.listen("path/to/recording.wav")        # STT
#   voice.speak_and_play("Hello!")                      # TTS + auto-play
# ============================================================

from __future__ import annotations

import os
import tempfile
from typing import Optional

# optional TTS
try:
    from gtts import gTTS as _gTTS
    _GTTS_AVAILABLE = True
except ImportError:
    _GTTS_AVAILABLE = False

# optional audio playback
try:
    import pygame as _pygame
    _PYGAME_AVAILABLE = True
except ImportError:
    _PYGAME_AVAILABLE = False

# optional pyttsx3 (offline TTS fallback)
try:
    import pyttsx3 as _pyttsx3
    _PYTTSX3_AVAILABLE = True
except ImportError:
    _PYTTSX3_AVAILABLE = False


# ============================================================
# VoiceInterface
# ============================================================

class VoiceInterface:
    """
    GENESIS voice layer.

    TTS backends (tried in order):
      1. gTTS  (online, good quality)  — pip install gtts
      2. pyttsx3 (offline)             — pip install pyttsx3

    STT backend:
      - Whisper via M1 Ingestion.from_audio()

    Args:
        lang:       TTS language code (default "en")
        tts_speed:  gTTS slow mode; False = normal speed
        output_dir: where to save generated audio files
    """

    def __init__(
        self,
        lang: str = "en",
        tts_slow: bool = False,
        output_dir: Optional[str] = None,
    ):
        self.lang       = lang
        self.tts_slow   = tts_slow
        self.output_dir = output_dir or tempfile.gettempdir()

        if _GTTS_AVAILABLE:
            self._tts_backend = "gtts"
        elif _PYTTSX3_AVAILABLE:
            self._tts_backend = "pyttsx3"
            self._engine = _pyttsx3.init()
        else:
            self._tts_backend = "none"
            print(
                "[VoiceInterface] No TTS backend found. "
                "pip install gtts  OR  pip install pyttsx3"
            )

        print(f"[VoiceInterface] Ready  tts={self._tts_backend} lang={lang}")

    # ── TTS ───────────────────────────────────────────────

    def speak(self, text: str, filename: Optional[str] = None) -> Optional[str]:
        """
        Convert text to speech and save to an audio file.

        Args:
            text:     text to speak
            filename: output filename (auto-generated if omitted)

        Returns:
            Path to the generated audio file, or None on failure.
        """
        if not text.strip():
            return None

        out = filename or os.path.join(
            self.output_dir, f"genesis_tts_{abs(hash(text[:30]))}.mp3"
        )

        if self._tts_backend == "gtts":
            try:
                tts = _gTTS(text=text, lang=self.lang, slow=self.tts_slow)
                tts.save(out)
                return out
            except Exception as e:
                print(f"[VoiceInterface] gTTS error: {e}")
                return None

        elif self._tts_backend == "pyttsx3":
            try:
                out_wav = out.replace(".mp3", ".wav")
                self._engine.save_to_file(text, out_wav)
                self._engine.runAndWait()
                return out_wav
            except Exception as e:
                print(f"[VoiceInterface] pyttsx3 error: {e}")
                return None

        print("[VoiceInterface] No TTS backend available.")
        return None

    def speak_and_play(self, text: str) -> Optional[str]:
        """
        TTS then immediately play the audio.
        Requires pygame: pip install pygame
        """
        path = self.speak(text)
        if path:
            self.play(path)
        return path

    def play(self, audio_path: str):
        """Play an audio file (requires pygame)."""
        if not _PYGAME_AVAILABLE:
            print(
                "[VoiceInterface] pygame not installed — cannot play audio. "
                f"File saved at: {audio_path}"
            )
            return
        try:
            _pygame.mixer.init()
            _pygame.mixer.music.load(audio_path)
            _pygame.mixer.music.play()
            while _pygame.mixer.music.get_busy():
                _pygame.time.Clock().tick(10)
        except Exception as e:
            print(f"[VoiceInterface] Playback error: {e}")

    # ── STT ───────────────────────────────────────────────

    def listen(
        self,
        audio_path: str,
        whisper_size: str = "base",
        translate_hindi: bool = True,
    ) -> dict:
        """
        Transcribe an audio file using Whisper (via M1 Ingestion).

        Args:
            audio_path:      path to audio/video file
            whisper_size:    Whisper model size ("tiny","base","small","medium")
            translate_hindi: auto-translate Hindi → English

        Returns:
            Same dict as Ingestion.from_audio():
            {"text", "language", "english", "combined"}
        """
        try:
            from modules.m1_self_learner.ingestion import Ingestion
            return Ingestion.from_audio(
                audio_path,
                whisper_size=whisper_size,
                translate_hindi=translate_hindi,
            )
        except ImportError as e:
            return {
                "text": "",
                "language": "unknown",
                "english": None,
                "combined": "",
                "error": str(e),
            }
        except Exception as e:
            print(f"[VoiceInterface] STT error: {e}")
            return {
                "text": "",
                "language": "unknown",
                "english": None,
                "combined": "",
                "error": str(e),
            }

    def listen_text(self, audio_path: str, **kwargs) -> str:
        """Convenience wrapper — returns the combined transcript string."""
        result = self.listen(audio_path, **kwargs)
        return result.get("combined", result.get("text", ""))

    # ── utility ───────────────────────────────────────────

    def available_backends(self) -> dict:
        return {
            "tts_backend": self._tts_backend,
            "gtts":        _GTTS_AVAILABLE,
            "pyttsx3":     _PYTTSX3_AVAILABLE,
            "pygame":      _PYGAME_AVAILABLE,
        }

    def __repr__(self) -> str:
        return (
            f"<VoiceInterface tts={self._tts_backend} "
            f"lang={self.lang}>"
        )
