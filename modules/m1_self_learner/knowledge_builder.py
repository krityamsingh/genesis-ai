# ============================================================
# modules/m1_self_learner/knowledge_builder.py
# GENESIS M1 — Knowledge Builder
#
# Orchestrates the full learn pipeline:
#   Ingestion → SkillExtractor → KnowledgeGraph
#
# Also handles:
#   - Cross-source connection finding
#   - Knowledge gap detection
#   - Incremental knowledge merging
#   - Learning progress tracking
# ============================================================

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field, asdict
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph

from modules.m1_self_learner.ingestion      import Ingestion
from modules.m1_self_learner.skill_extractor import SkillExtractor, ExtractionResult


# ════════════════════════════════════════════════════════════
# 📦  Data Models
# ════════════════════════════════════════════════════════════

@dataclass
class LearningSession:
    session_id:     str
    source:         str
    source_type:    str       # text / url / pdf / youtube / audio / file
    started_at:     float     = field(default_factory=time.time)
    finished_at:    float     = 0.0
    items_stored:   int       = 0
    domain:         str       = ""
    difficulty:     str       = ""
    error:          str       = ""
    response:       str       = ""   # human-readable summary

    @property
    def duration_sec(self) -> float:
        if self.finished_at and self.finished_at > self.started_at:
            diff = self.finished_at - self.started_at
            # Use max with a tiny epsilon so completed sessions always show > 0
            return max(round(diff, 4), 0.0001)
        return 0.0

    def to_dict(self) -> dict:
        d = asdict(self)
        d["duration_sec"] = self.duration_sec
        return d

    def failed(self, error: str) -> LearningSession:
        self.error       = error
        self.finished_at = time.time()
        return self

    def succeeded(self, response: str, items: int,
                  domain: str, difficulty: str) -> LearningSession:
        self.response     = response
        self.items_stored = items
        self.domain       = domain
        self.difficulty   = difficulty
        self.finished_at  = time.time()
        return self


@dataclass
class KnowledgeGap:
    topic:       str
    description: str
    suggested_resources: list[str] = field(default_factory=list)


# ════════════════════════════════════════════════════════════
# 🏗️  KnowledgeBuilder
# ════════════════════════════════════════════════════════════

class KnowledgeBuilder:
    """
    Orchestrates the full M1 learn pipeline.
    All public methods return a dict compatible with the
    existing genesis_learn() / what_next() interface.
    """

    def __init__(self, engine: GemmaEngine, kg: KnowledgeGraph):
        self.engine    = engine
        self.kg        = kg
        self.extractor = SkillExtractor(engine, kg)
        self._sessions: list[LearningSession] = []

    # ────────────────────────────────────────────────────────
    # PUBLIC — learn_from_*  (all return dict for M1 compat)
    # ────────────────────────────────────────────────────────

    def learn_from_text(self, text: str,
                        source: str = "direct_input") -> dict:
        session = self._new_session(source, "text")
        try:
            raw = Ingestion.from_text(text)
            result = self.extractor.extract_and_store(
                raw, source=source, doc_id=Ingestion.make_doc_id(raw, "t_")
            )
            return self._finish(session, result)
        except Exception as e:
            return self._error(session, e)

    def learn_from_url(self, url: str) -> dict:
        session = self._new_session(url, "url")
        try:
            print(f"   🌐 Fetching: {url}")
            raw = Ingestion.from_url(url)
            result = self.extractor.extract_and_store(
                raw, source=url, doc_id=Ingestion.make_doc_id(url, "u_")
            )
            return self._finish(session, result)
        except Exception as e:
            return self._error(session, e)

    def learn_from_pdf(self, pdf_path: str) -> dict:
        session = self._new_session(pdf_path, "pdf")
        try:
            print(f"   📄 Reading PDF: {pdf_path}")
            raw = Ingestion.from_pdf(pdf_path)
            result = self.extractor.extract_and_store(
                raw, source=pdf_path,
                doc_id=Ingestion.make_doc_id(pdf_path, "p_")
            )
            return self._finish(session, result)
        except Exception as e:
            return self._error(session, e)

    def learn_from_file(self, file_path: str) -> dict:
        session = self._new_session(file_path, "file")
        try:
            print(f"   📁 Reading file: {file_path}")
            raw = Ingestion.from_file(file_path)
            result = self.extractor.extract_and_store(
                raw, source=file_path,
                doc_id=Ingestion.make_doc_id(file_path, "f_")
            )
            return self._finish(session, result)
        except Exception as e:
            return self._error(session, e)

    def learn_from_audio(self, audio_path: str,
                          source_label: str = None) -> dict:
        """
        Transcribe audio with Whisper then learn from transcript.
        source_label overrides the path in metadata (e.g. "YouTube:...")
        """
        source  = source_label or f"audio:{audio_path}"
        session = self._new_session(source, "audio")
        try:
            audio_data = Ingestion.from_audio(audio_path)
            combined   = audio_data["combined"]
            language   = audio_data["language"]
            result = self.extractor.extract_and_store(
                combined,
                source=f"{source} [{language}]",
                doc_id=Ingestion.make_doc_id(combined, "a_")
            )
            return self._finish(session, result)
        except Exception as e:
            return self._error(session, e)

    def learn_from_youtube_data(
        self,
        audio_transcript: str,
        visual_analysis:  str,
        url:              str,
        language:         str = "en",
    ) -> dict:
        """
        Receives pre-processed audio transcript + visual analysis
        from the Telegram/MegaSaverBot pipeline and stores it.
        """
        source  = f"YouTube:{url} [{language}]"
        session = self._new_session(source, "youtube")
        try:
            combined = (
                f"[AUDIO TRANSCRIPT]\n{audio_transcript}\n\n"
                f"{visual_analysis}"
            )
            result = self.extractor.extract_and_store(
                combined, source=source,
                doc_id=Ingestion.make_doc_id(url, "yt_")
            )
            return self._finish(session, result)
        except Exception as e:
            return self._error(session, e)

    # ────────────────────────────────────────────────────────
    # PUBLIC — knowledge operations
    # ────────────────────────────────────────────────────────

    def search_knowledge(self, query: str, n: int = 5) -> list[str]:
        """Search KG and return matching text chunks."""
        return self.kg.search("knowledge", query, n_results=n)

    def find_connections(self, n_results: int = 10) -> str:
        """Ask Gemma to find non-obvious connections across stored knowledge."""
        all_k = "\n\n---\n\n".join(
            self.kg.search("knowledge", "everything", n_results=n_results)
        )
        if not all_k.strip():
            return "No knowledge stored yet."

        return self.engine.think(
            prompt=f"Knowledge base:\n{all_k}\n\nFind 5 non-obvious cross-domain connections.",
            system_prompt="You are a cross-domain synthesis expert. Be specific.",
            temperature=0.8,
        )

    def detect_gaps(self, topic: str) -> list[KnowledgeGap]:
        """Identify what's missing in our knowledge about a topic."""
        existing = "\n\n".join(self.search_knowledge(topic, n=5))
        if not existing:
            return [KnowledgeGap(
                topic=topic,
                description="No knowledge found on this topic.",
                suggested_resources=[f"Search Google for '{topic} tutorial'"]
            )]

        raw = self.engine.think(
            prompt=(
                f"Topic: {topic}\n\n"
                f"Existing knowledge:\n{existing}\n\n"
                "List 3 important knowledge gaps as JSON:\n"
                '[{"topic": "...", "description": "...", '
                '"suggested_resources": ["..."]}]'
            ),
            system_prompt="Return JSON only. No explanation.",
            temperature=0.4,
        )
        try:
            import re, json
            clean = re.sub(r"```(?:json)?", "", raw).strip()
            items = json.loads(clean)
            return [KnowledgeGap(**g) for g in items]
        except Exception:
            return [KnowledgeGap(
                topic=topic,
                description=raw[:300],
                suggested_resources=[]
            )]

    def merge_knowledge(self, topic: str) -> str:
        """
        Pull all stored knowledge on a topic and ask Gemma to
        produce a single coherent merged understanding.
        """
        chunks = self.search_knowledge(topic, n=8)
        if not chunks:
            return f"No knowledge found about '{topic}'."

        merged = self.engine.think(
            prompt=(
                f"These are multiple knowledge chunks about '{topic}':\n\n"
                + "\n\n---\n\n".join(chunks)
                + "\n\nMerge into one coherent, non-redundant knowledge summary."
            ),
            system_prompt="You are a knowledge curator. Remove duplicates, resolve conflicts.",
            temperature=0.3,
            max_tokens=2048,
        )

        # Store the merged result back
        self.kg.store(
            "knowledge", merged,
            metadata={"source": "merged", "type": "merged_knowledge",
                      "topic": topic},
            doc_id=Ingestion.make_doc_id(topic + "_merged", "m_"),
        )
        return merged

    def learning_stats(self) -> dict:
        """Return statistics about all learning sessions."""
        total    = len(self._sessions)
        success  = sum(1 for s in self._sessions if not s.error)
        failed   = total - success
        domains  = list({s.domain for s in self._sessions if s.domain})
        avg_dur  = (
            sum(s.duration_sec for s in self._sessions) / total
            if total else 0
        )
        return {
            "total_sessions":  total,
            "successful":      success,
            "failed":          failed,
            "domains_covered": domains,
            "avg_duration_sec": round(avg_dur, 2),
            "last_source":     self._sessions[-1].source if self._sessions else None,
        }

    # ────────────────────────────────────────────────────────
    # PRIVATE helpers
    # ────────────────────────────────────────────────────────

    def _new_session(self, source: str, stype: str) -> LearningSession:
        import uuid
        s = LearningSession(
            session_id=str(uuid.uuid4())[:8],
            source=source,
            source_type=stype,
        )
        self._sessions.append(s)
        return s

    def _finish(self, session: LearningSession,
                result: ExtractionResult) -> dict:
        summary = self._build_summary(result)
        session.succeeded(
            response=summary,
            items=result.total_items,
            domain=result.domain,
            difficulty=result.difficulty,
        )
        return {
            "response":             summary,
            "source":               session.source,
            "knowledge_items_stored": result.total_items,
            "domain":               result.domain,
            "difficulty":           result.difficulty,
            "skills_found":         len(result.skills),
            "concepts_found":       len(result.concepts),
            "duration_sec":         session.duration_sec,
            "error":                None,
        }

    def _error(self, session: LearningSession,
               exc: Exception) -> dict:
        msg = str(exc)
        session.failed(msg)
        return {
            "response":             "",
            "source":               session.source,
            "knowledge_items_stored": 0,
            "error":                msg,
        }

    @staticmethod
    def _build_summary(result: ExtractionResult) -> str:
        lines = [
            f"📚 Learned from: {result.source}",
            f"🏷️  Domain: {result.domain}  |  Level: {result.difficulty}",
            f"📊 Extracted: {len(result.skills)} skills, "
            f"{len(result.concepts)} concepts, "
            f"{len(result.key_facts)} facts",
            "",
        ]
        if result.main_topics:
            lines += ["🔑 Main topics:"]
            lines += [f"   • {t}" for t in result.main_topics[:5]]
            lines.append("")

        if result.key_facts:
            lines += ["💡 Key facts:"]
            lines += [f"   • {f}" for f in result.key_facts[:5]]
            lines.append("")

        if result.skills:
            lines += ["🛠️  Skills identified:"]
            lines += [f"   [{s.level.upper()}] {s.name}"
                      for s in result.skills[:5]]
            lines.append("")

        lines += ["📝 Summary:", result.raw_summary]
        return "\n".join(lines)
