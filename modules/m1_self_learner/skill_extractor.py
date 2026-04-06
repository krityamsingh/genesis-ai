# ============================================================
# modules/m1_self_learner/skill_extractor.py
# GENESIS M1 — Skill & Concept Extractor
#
# Takes raw text → structured skill/concept objects
# Uses GemmaEngine to extract, then stores in KnowledgeGraph
# ============================================================

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field, asdict
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from core.gemma_engine    import GemmaEngine
    from core.knowledge_graph import KnowledgeGraph


# ════════════════════════════════════════════════════════════
# 📦  Data Models
# ════════════════════════════════════════════════════════════

@dataclass
class Skill:
    name:        str
    level:       str          # beginner / intermediate / advanced
    domain:      str          # e.g. "programming", "finance", "science"
    description: str
    prerequisites: list[str]  = field(default_factory=list)
    related:       list[str]  = field(default_factory=list)
    source:        str        = ""

    def to_dict(self) -> dict:
        return asdict(self)

    def to_text(self) -> str:
        parts = [
            f"SKILL: {self.name}",
            f"Domain: {self.domain}",
            f"Level: {self.level}",
            f"Description: {self.description}",
        ]
        if self.prerequisites:
            parts.append(f"Prerequisites: {', '.join(self.prerequisites)}")
        if self.related:
            parts.append(f"Related: {', '.join(self.related)}")
        return "\n".join(parts)


@dataclass
class Concept:
    name:        str
    definition:  str
    domain:      str
    examples:    list[str] = field(default_factory=list)
    key_terms:   list[str] = field(default_factory=list)
    source:      str       = ""

    def to_dict(self) -> dict:
        return asdict(self)

    def to_text(self) -> str:
        parts = [
            f"CONCEPT: {self.name}",
            f"Domain: {self.domain}",
            f"Definition: {self.definition}",
        ]
        if self.examples:
            parts.append(f"Examples: {'; '.join(self.examples)}")
        if self.key_terms:
            parts.append(f"Key terms: {', '.join(self.key_terms)}")
        return "\n".join(parts)


@dataclass
class ExtractionResult:
    skills:        list[Skill]
    concepts:      list[Concept]
    key_facts:     list[str]
    main_topics:   list[str]
    difficulty:    str          # beginner / intermediate / advanced
    domain:        str
    source:        str
    raw_summary:   str

    @property
    def total_items(self) -> int:
        return len(self.skills) + len(self.concepts) + len(self.key_facts)

    def to_storage_text(self) -> str:
        """Flat text representation for KnowledgeGraph storage."""
        parts = [f"SOURCE: {self.source}", f"DOMAIN: {self.domain}",
                 f"DIFFICULTY: {self.difficulty}", ""]

        if self.main_topics:
            parts += ["MAIN TOPICS:", *[f"  • {t}" for t in self.main_topics], ""]

        if self.key_facts:
            parts += ["KEY FACTS:", *[f"  • {f}" for f in self.key_facts], ""]

        if self.skills:
            parts += ["SKILLS IDENTIFIED:"]
            for s in self.skills:
                parts.append(f"  [{s.level.upper()}] {s.name} ({s.domain})")
                parts.append(f"    → {s.description}")
            parts.append("")

        if self.concepts:
            parts += ["CONCEPTS IDENTIFIED:"]
            for c in self.concepts:
                parts.append(f"  {c.name}: {c.definition}")
            parts.append("")

        parts += ["SUMMARY:", self.raw_summary]
        return "\n".join(parts)


# ════════════════════════════════════════════════════════════
# 🔬  SkillExtractor
# ════════════════════════════════════════════════════════════

class SkillExtractor:
    """
    Uses GemmaEngine to extract structured skills, concepts, and
    facts from any text. Stores results in KnowledgeGraph.
    """

    # Gemma prompt for extraction
    _EXTRACTION_PROMPT = """\
Analyse the following content and extract structured information.
Respond ONLY with valid JSON — no markdown fences, no explanation.

JSON schema:
{{
  "domain": "primary domain (e.g. programming, science, finance, cooking...)",
  "difficulty": "beginner | intermediate | advanced",
  "main_topics": ["topic1", "topic2", ...],
  "key_facts": ["fact1", "fact2", ...],   // max 8 specific, concrete facts
  "skills": [
    {{
      "name": "skill name",
      "level": "beginner | intermediate | advanced",
      "domain": "sub-domain",
      "description": "one sentence description",
      "prerequisites": ["prereq1"],
      "related": ["related_skill1"]
    }}
  ],
  "concepts": [
    {{
      "name": "concept name",
      "definition": "clear, concise definition",
      "domain": "sub-domain",
      "examples": ["example1"],
      "key_terms": ["term1", "term2"]
    }}
  ],
  "summary": "2-3 sentence summary of the entire content"
}}

Content to analyse:
{content}
"""

    def __init__(self, engine: GemmaEngine, kg: KnowledgeGraph):
        self.engine = engine
        self.kg     = kg

    # ────────────────────────────────────────────────────────
    # PUBLIC
    # ────────────────────────────────────────────────────────

    def extract(self, text: str, source: str = "unknown") -> ExtractionResult:
        """
        Main extraction entry point.
        Sends text to Gemma, parses response, returns ExtractionResult.
        """
        # Truncate to avoid token limits (keep first + last portion)
        content = self._smart_truncate(text, max_chars=5000)

        print(f"   🔬 Extracting skills/concepts from {len(text)} chars...")

        raw = self.engine.think(
            prompt=self._EXTRACTION_PROMPT.format(content=content),
            system_prompt=(
                "You are a knowledge extraction specialist. "
                "Always return valid JSON only. No extra text."
            ),
            temperature=0.2,
            max_tokens=2048,
        )

        parsed = self._parse_json(raw)
        result = self._build_result(parsed, source, text)

        print(f"   ✅ Extracted: {len(result.skills)} skills, "
              f"{len(result.concepts)} concepts, "
              f"{len(result.key_facts)} facts")
        return result

    def extract_and_store(self, text: str, source: str = "unknown",
                          doc_id: str = None) -> ExtractionResult:
        """Extract then store all items in the KnowledgeGraph."""
        result = self.extract(text, source)
        self._store(result, doc_id)
        return result

    def extract_skills_only(self, text: str,
                             source: str = "unknown") -> list[Skill]:
        """Lightweight extraction — skills only, faster."""
        result = self.extract(text, source)
        return result.skills

    def get_skill_map(self, query: str) -> list[Skill]:
        """Search KG for skills matching a query."""
        raw_results = self.kg.search("knowledge", query, n_results=10)
        skills = []
        for r in raw_results:
            if "SKILL:" in r:
                # Parse back from stored text
                lines = r.split("\n")
                name = next((l.replace("SKILL:", "").strip()
                             for l in lines if l.startswith("SKILL:")), "")
                desc = next((l.replace("Description:", "").strip()
                             for l in lines if "Description:" in l), "")
                if name:
                    skills.append(Skill(
                        name=name, level="unknown",
                        domain="unknown", description=desc,
                        source=source
                    ))
        return skills

    # ────────────────────────────────────────────────────────
    # PRIVATE
    # ────────────────────────────────────────────────────────

    def _parse_json(self, raw: str) -> dict:
        """Robustly parse JSON from Gemma output."""
        # Strip markdown fences if present
        clean = re.sub(r"```(?:json)?", "", raw).strip()
        # Find first { ... } block
        match = re.search(r"\{.*\}", clean, re.DOTALL)
        if match:
            clean = match.group(0)
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            # Fallback: return minimal structure
            print("   ⚠️  JSON parse failed — using fallback extraction")
            return {
                "domain": "general",
                "difficulty": "unknown",
                "main_topics": [],
                "key_facts":   [raw[:300]],
                "skills":      [],
                "concepts":    [],
                "summary":     raw[:500],
            }

    def _build_result(self, data: dict, source: str,
                      original_text: str) -> ExtractionResult:
        skills = [
            Skill(
                name=s.get("name", ""),
                level=s.get("level", "unknown"),
                domain=s.get("domain", data.get("domain", "general")),
                description=s.get("description", ""),
                prerequisites=s.get("prerequisites", []),
                related=s.get("related", []),
                source=source,
            )
            for s in data.get("skills", [])
            if s.get("name")
        ]
        concepts = [
            Concept(
                name=c.get("name", ""),
                definition=c.get("definition", ""),
                domain=c.get("domain", data.get("domain", "general")),
                examples=c.get("examples", []),
                key_terms=c.get("key_terms", []),
                source=source,
            )
            for c in data.get("concepts", [])
            if c.get("name")
        ]
        return ExtractionResult(
            skills=skills,
            concepts=concepts,
            key_facts=data.get("key_facts", []),
            main_topics=data.get("main_topics", []),
            difficulty=data.get("difficulty", "unknown"),
            domain=data.get("domain", "general"),
            source=source,
            raw_summary=data.get("summary", ""),
        )

    def _store(self, result: ExtractionResult, doc_id: str = None):
        """Persist ExtractionResult to KnowledgeGraph."""
        # Store full extraction as one document
        storage_text = result.to_storage_text()
        _id = doc_id or hashlib.sha256(
            storage_text[:200].encode()).hexdigest()[:16]
        self.kg.store(
            "knowledge", storage_text,
            metadata={
                "source":     result.source,
                "type":       "skill_extraction",
                "domain":     result.domain,
                "difficulty": result.difficulty,
                "n_skills":   len(result.skills),
                "n_concepts": len(result.concepts),
            },
            doc_id=_id,
        )

        # Also store each skill individually for fine-grained search
        for skill in result.skills:
            skill_id = hashlib.sha256(
                skill.name.encode()).hexdigest()[:12]
            self.kg.store(
                "knowledge", skill.to_text(),
                metadata={
                    "source": result.source,
                    "type":   "skill",
                    "domain": skill.domain,
                    "level":  skill.level,
                },
                doc_id=f"skill_{skill_id}",
            )

    @staticmethod
    def _smart_truncate(text: str, max_chars: int) -> str:
        """Keep first 70% + last 30% to preserve conclusion."""
        if len(text) <= max_chars:
            return text
        head = int(max_chars * 0.70)
        tail = max_chars - head
        return text[:head] + "\n...[truncated]...\n" + text[-tail:]


# ── missing import fix ─────────────────────────────────────
import hashlib
