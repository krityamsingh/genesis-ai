# ============================================================
# genesis.py
# GENESIS — Top-Level Entry Point
#
# Single import point. Wires Core + M1 together.
#
# Quickstart:
#   from genesis import Genesis
#
#   g = Genesis(hf_token=HF_TOKEN)        # auto-init everything
#   g.learn("https://...")                # M1 learn
#   g.ask("What is backpropagation?")     # M1 ask
#   g.teach("transformers")               # M1 teach
#   g.quiz("attention mechanism")         # M1 quiz
#   g.route("Simulate a market crash")    # Router -> best module
#   g.memory.add_user("hello")            # MemoryManager
#   g.voice.speak("Hello I am GENESIS")   # VoiceInterface
# ============================================================

from __future__ import annotations

from typing import Optional

from core.gemma_engine    import GemmaEngine, GEMMA4_MODELS
from core.knowledge_graph import KnowledgeGraph
from core.memory_manager  import MemoryManager
from core.router          import Router
from core.voice_interface import VoiceInterface
from modules              import M1, create_m1


class Genesis:
    """
    GENESIS — unified AI system.

    Wires together:
        GemmaEngine → KnowledgeGraph → MemoryManager
        M1 (Self-Learner) ← connected to engine + kg
        Router            ← dispatches queries to modules
        VoiceInterface    ← TTS / STT

    Args:
        hf_token:    HuggingFace API token
        model:       Gemma model variant ("default","fast","mini")
        persist_dir: optional path for persistent KG storage
        lang:        TTS language (default "en")
    """

    def __init__(
        self,
        hf_token: str,
        model:       str           = "default",
        persist_dir: Optional[str] = None,
        lang:        str           = "en",
    ):
        print("=" * 55)
        print("  GENESIS — initialising")
        print("=" * 55)

        # Core layer
        self.engine = GemmaEngine(token=hf_token, model=model)
        self.kg     = KnowledgeGraph(persist_dir=persist_dir)
        self.memory = MemoryManager(self.kg)
        self.voice  = VoiceInterface(lang=lang)

        # Modules
        self.m1 = create_m1(self.engine, self.kg)

        # Router — register active modules
        self.router = Router(self.engine, default_module="m1")
        self.router.register("m1", self.m1.ask)

        print("=" * 55)
        print("  GENESIS ready")
        print(f"  engine  : {self.engine.model_id}")
        print(f"  kg      : {self.kg}")
        print(f"  modules : m1 (self-learner)")
        print("=" * 55)

    # ── M1 shortcuts ──────────────────────────────────────

    def learn(self, source: str) -> dict:
        """Learn from any source (URL, PDF, text, audio, file)."""
        result = self.m1.learn(source)
        # Log to memory
        self.memory.add_system(f"Learned from: {source}")
        return result

    def ask(self, question: str) -> str:
        """Answer a question from stored knowledge."""
        self.memory.add_user(question)
        answer = self.m1.ask(question)
        self.memory.add_assistant(answer)
        return answer

    def teach(self, topic: str, level: str = "intermediate") -> str:
        """Teach a topic."""
        return self.m1.teach(topic, level)

    def quiz(self, topic: str, n: int = 3) -> str:
        """Generate a quiz."""
        return self.m1.quiz(topic, n)

    def flashcards(self, topic: str, n: int = 5) -> str:
        """Generate flashcards."""
        return self.m1.flashcards(topic, n)

    def summarise(self) -> str:
        """Summarise all stored knowledge."""
        return self.m1.summarise()

    # ── Router ────────────────────────────────────────────

    def route(self, query: str) -> dict:
        """Route a query to the best module automatically."""
        self.memory.add_user(query)
        result = self.router.route(query)
        if isinstance(result.get("response"), str):
            self.memory.add_assistant(result["response"])
        return result

    # ── Voice ─────────────────────────────────────────────

    def speak(self, text: str) -> Optional[str]:
        """Convert text to speech. Returns audio file path."""
        return self.voice.speak(text)

    def listen(self, audio_path: str) -> str:
        """Transcribe an audio file. Returns transcript text."""
        return self.voice.listen_text(audio_path)

    # ── Memory ────────────────────────────────────────────

    def save_session(self, label: Optional[str] = None):
        """Persist current conversation to KG."""
        self.memory.save_to_kg(label)

    def load_session(self, label: str) -> bool:
        """Reload a saved conversation from KG."""
        return self.memory.load_from_kg(label)

    # ── Stats ─────────────────────────────────────────────

    def stats(self) -> dict:
        return {
            "engine":  str(self.engine),
            "kg":      self.kg.stats(),
            "memory":  self.memory.stats(),
            "router":  self.router.stats(),
            "m1":      self.m1.stats(),
        }

    def __repr__(self) -> str:
        return f"<Genesis engine={self.engine.model_id} m1={self.m1}>"


# ── Quick test ────────────────────────────────────────────

def test_genesis(hf_token: str):
    """
    Smoke test for the full Genesis stack.
    Run: test_genesis(HF_TOKEN)
    """
    print("\n=== GENESIS smoke test ===\n")

    g = Genesis(hf_token=hf_token, model="mini")

    # Learn from text
    result = g.learn(
        "Python decorators are a design pattern that allows "
        "behaviour to be added to functions or classes without "
        "modifying them. They use the @syntax and are widely "
        "used in frameworks like Flask and FastAPI."
    )
    print("Learn result:", result.get("response", "")[:200])

    # Ask
    answer = g.ask("What is a Python decorator?")
    print("\nAsk:", answer[:200])

    # Stats
    print("\nStats:", g.stats())
    print("\n=== All OK ===")
    return g
