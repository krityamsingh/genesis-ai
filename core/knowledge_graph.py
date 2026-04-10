# ============================================================
# core/knowledge_graph.py
# GENESIS — Knowledge Graph (Vector Store)
#
# Lightweight in-memory vector store using chromadb.
# Falls back to a pure-Python TF-IDF store if chromadb
# is not installed — so the project works in Colab / local
# with zero extra setup.
#
# API used by M1 (and all future modules):
#   kg = KnowledgeGraph()
#   kg.store("knowledge", text, metadata={...}, doc_id="abc")
#   kg.search("knowledge", "query string", n_results=5)  -> list[str]
#   kg.delete("knowledge", doc_id="abc")
#   kg.list_collections()                                -> list[str]
#   kg.count("knowledge")                                -> int
#   kg.reset("knowledge")
#   kg.reset_all()
#   kg.stats()                                           -> dict
# ============================================================

from __future__ import annotations

import hashlib
import math
import re
from collections import defaultdict
from typing import Any, Optional

# optional chromadb
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    _CHROMA_AVAILABLE = True
except ImportError:
    _CHROMA_AVAILABLE = False


# ============================================================
# Pure-Python TF-IDF fallback store
# ============================================================

class _TFIDFCollection:
    """Minimal in-memory TF-IDF retriever. No external deps."""

    def __init__(self, name: str):
        self.name = name
        self._docs: dict[str, dict] = {}
        self._index: dict[str, dict[str, float]] = {}
        self._dirty = False

    def add(self, doc_id: str, text: str, metadata: dict):
        self._docs[doc_id] = {"text": text, "metadata": metadata or {}}
        self._dirty = True

    def delete(self, doc_id: str):
        self._docs.pop(doc_id, None)
        self._dirty = True

    def count(self) -> int:
        return len(self._docs)

    def reset(self):
        self._docs.clear()
        self._index.clear()
        self._dirty = False

    def search(self, query: str, n_results: int = 5) -> list[str]:
        if not self._docs:
            return []
        if self._dirty:
            self._build_index()

        q_terms = self._tokenise(query)
        scores: dict[str, float] = defaultdict(float)

        for term in q_terms:
            if term in self._index:
                for doc_id, score in self._index[term].items():
                    scores[doc_id] += score

        ranked = sorted(scores, key=scores.__getitem__, reverse=True)
        results = [self._docs[d]["text"] for d in ranked[:n_results]]

        # fallback: return most recent docs if no TF-IDF hits
        if not results:
            recent = list(self._docs.values())[-n_results:]
            results = [d["text"] for d in recent]

        return results

    def _build_index(self):
        self._index.clear()
        N = len(self._docs)
        df: dict[str, set] = defaultdict(set)
        tf_raw: dict[str, dict[str, int]] = {}

        for doc_id, doc in self._docs.items():
            terms = self._tokenise(doc["text"])
            counts: dict[str, int] = defaultdict(int)
            for t in terms:
                counts[t] += 1
                df[t].add(doc_id)
            tf_raw[doc_id] = dict(counts)
            total = max(len(terms), 1)
            for t, c in counts.items():
                tf_norm = c / total
                idf = math.log((N + 1) / (len(df[t]) + 1)) + 1.0
                self._index.setdefault(t, {})[doc_id] = tf_norm * idf

        self._dirty = False

    @staticmethod
    def _tokenise(text: str) -> list[str]:
        stops = {
            "the","a","an","and","or","but","in","on","at","to",
            "for","of","with","by","from","is","are","was","were",
            "be","been","has","have","had","do","does","did","this",
            "that","it","its","we","you","i","my","your","our","their",
        }
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        return [t for t in tokens if t not in stops and len(t) > 1]


# ============================================================
# KnowledgeGraph  (public class)
# ============================================================

class KnowledgeGraph:
    """
    GENESIS Knowledge Graph — unified vector store.

    Automatically uses ChromaDB (persistent, embedding-based) when
    available, otherwise falls back to the built-in TF-IDF store.

    Usage:
        kg = KnowledgeGraph()                             # in-memory
        kg = KnowledgeGraph(persist_dir="/tmp/genesis")  # on-disk (chroma)

        kg.store("knowledge", text, metadata={...}, doc_id="abc")
        results = kg.search("knowledge", "query")   # -> list[str]
        kg.delete("knowledge", doc_id="abc")
        kg.reset("knowledge")
        kg.reset_all()
        n = kg.count("knowledge")                   # -> int
        cols = kg.list_collections()                # -> list[str]
        info = kg.stats()                           # -> dict
    """

    def __init__(self, persist_dir: Optional[str] = None):
        self._persist_dir = persist_dir
        self._backend = "chromadb" if _CHROMA_AVAILABLE else "tfidf"

        if _CHROMA_AVAILABLE:
            self._init_chroma(persist_dir)
        else:
            print(
                "[KnowledgeGraph] chromadb not found — "
                "using built-in TF-IDF store. "
                "pip install chromadb  to enable semantic search."
            )
            self._tfidf_cols: dict[str, _TFIDFCollection] = {}

        print(f"[KnowledgeGraph] Ready  backend={self._backend}")

    # ── chromadb init ─────────────────────────────────────

    def _init_chroma(self, persist_dir: Optional[str]):
        import os
        host = os.getenv("CHROMA_HOST", "")
        
        if host:
            # Remote mode (e.g. Chroma Cloud)
            api_key = os.getenv("CHROMA_API_KEY", "")
            tenant  = os.getenv("CHROMA_TENANT", "default_tenant")
            db_name = os.getenv("CHROMA_DATABASE", "default_database")
            
            settings = ChromaSettings(anonymized_telemetry=False)
            if api_key:
                settings.chroma_client_auth_provider = "chromadb.auth.token.TokenAuthClientProvider"
                settings.chroma_client_auth_credentials = api_key
            
            self._chroma = chromadb.HttpClient(
                host=host,
                tenant=tenant,
                database=db_name,
                settings=settings,
                ssl=host.startswith("https")
            )
            print(f"[KnowledgeGraph] Connected to remote Chroma: {host}")
        elif persist_dir:
            # Local persistent mode
            self._chroma = chromadb.PersistentClient(path=persist_dir)
        else:
            # Ephemeral mode
            self._chroma = chromadb.Client(
                ChromaSettings(anonymized_telemetry=False)
            )

    def _get_chroma_col(self, name: str):
        return self._chroma.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": "cosine"},
        )

    def _get_tfidf_col(self, name: str) -> _TFIDFCollection:
        if name not in self._tfidf_cols:
            self._tfidf_cols[name] = _TFIDFCollection(name)
        return self._tfidf_cols[name]

    # ── store ─────────────────────────────────────────────

    def store(
        self,
        collection: str,
        text: str,
        metadata: Optional[dict] = None,
        doc_id: Optional[str] = None,
    ) -> str:
        """
        Store a text document in the given collection.
        Returns the doc_id used.
        """
        if not text or not text.strip():
            return ""

        _id = doc_id or self._make_id(text)
        meta = {k: str(v) for k, v in (metadata or {}).items()}

        if self._backend == "chromadb":
            col = self._get_chroma_col(collection)
            col.upsert(ids=[_id], documents=[text], metadatas=[meta])
        else:
            col = self._get_tfidf_col(collection)
            col.add(_id, text, meta)

        return _id

    # ── search ────────────────────────────────────────────

    def search(
        self,
        collection: str,
        query: str,
        n_results: int = 5,
        where: Optional[dict] = None,
    ) -> list[str]:
        """
        Semantic (chromadb) or TF-IDF search over a collection.
        Returns list of matching document texts, best-match first.
        """
        if not query or not query.strip():
            return []

        if self._backend == "chromadb":
            col = self._get_chroma_col(collection)
            if col.count() == 0:
                return []
            kwargs: dict[str, Any] = {
                "query_texts": [query],
                "n_results": min(n_results, col.count()),
            }
            if where:
                kwargs["where"] = where
            try:
                result = col.query(**kwargs)
                return [d for d in result.get("documents", [[]])[0] if d]
            except Exception as e:
                print(f"[KnowledgeGraph] Search error: {e}")
                return []
        else:
            col = self._get_tfidf_col(collection)
            return col.search(query, n_results)

    # ── delete ────────────────────────────────────────────

    def delete(self, collection: str, doc_id: str):
        """Delete a specific document by ID."""
        if self._backend == "chromadb":
            try:
                self._get_chroma_col(collection).delete(ids=[doc_id])
            except Exception:
                pass
        else:
            self._get_tfidf_col(collection).delete(doc_id)

    # ── utility ───────────────────────────────────────────

    def count(self, collection: str) -> int:
        if self._backend == "chromadb":
            try:
                return self._get_chroma_col(collection).count()
            except Exception:
                return 0
        return self._get_tfidf_col(collection).count()

    def list_collections(self) -> list[str]:
        if self._backend == "chromadb":
            try:
                return [c.name for c in self._chroma.list_collections()]
            except Exception:
                return []
        return list(self._tfidf_cols.keys())

    def reset(self, collection: str):
        """Delete all documents in a collection."""
        if self._backend == "chromadb":
            try:
                self._chroma.delete_collection(collection)
            except Exception:
                pass
        elif collection in self._tfidf_cols:
            self._tfidf_cols[collection].reset()

    def reset_all(self):
        """Wipe every collection."""
        for col in self.list_collections():
            self.reset(col)
        if self._backend == "tfidf":
            self._tfidf_cols.clear()

    def stats(self) -> dict:
        cols = self.list_collections()
        return {
            "backend":     self._backend,
            "collections": {c: self.count(c) for c in cols},
            "total_docs":  sum(self.count(c) for c in cols),
        }

    @staticmethod
    def _make_id(text: str) -> str:
        h = hashlib.sha256(text[:300].encode()).hexdigest()[:16]
        return f"doc_{h}"

    def __repr__(self) -> str:
        s = self.stats()
        return f"<KnowledgeGraph backend={s['backend']} docs={s['total_docs']}>"
