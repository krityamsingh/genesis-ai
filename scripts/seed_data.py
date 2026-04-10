#!/usr/bin/env python3
"""
scripts/seed_data.py — seed DB + KG with sample data.
Usage: python scripts/seed_data.py
"""
import sys, os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database.seeds import seed_all
from core.knowledge_graph import KnowledgeGraph


SAMPLE_KNOWLEDGE = [
    ("Python decorators are a design pattern that allows behaviour to be added "
     "to functions or classes without modifying them. They use the @syntax.",
     {"domain": "programming", "source": "seed"}),

    ("Transformers are a type of neural network architecture based on self-attention "
     "mechanisms. They process all tokens in parallel, unlike RNNs.",
     {"domain": "ml", "source": "seed"}),

    ("Gradient descent is an optimisation algorithm that minimises a loss function "
     "by iteratively moving in the direction of the negative gradient.",
     {"domain": "ml", "source": "seed"}),

    ("ChromaDB is a vector database for storing and retrieving embeddings. "
     "It supports cosine similarity search and metadata filtering.",
     {"domain": "databases", "source": "seed"}),
]


def seed_knowledge():
    kg = KnowledgeGraph(persist_dir=os.getenv("KG_PERSIST_DIR") or None)
    for text, meta in SAMPLE_KNOWLEDGE:
        kg.store("knowledge", text, metadata=meta)
    print(f"[Seed] Stored {len(SAMPLE_KNOWLEDGE)} knowledge items. KG stats: {kg.stats()}")


if __name__ == "__main__":
    print("[Seed] Seeding database...")
    seed_all()
    print("[Seed] Seeding knowledge graph...")
    seed_knowledge()
    print("[Seed] Done.")
