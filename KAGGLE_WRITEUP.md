# GENESIS — Kaggle Competition Writeup

## Overview

GENESIS is a self-learning AI system that ingests knowledge from any source and
applies it across six specialist modules: learning, research, building, time reconstruction,
intuition, and reality simulation.

## Architecture Highlights

### Core Innovation: Shared Knowledge Graph
All six modules read from and write to a single `KnowledgeGraph` instance backed by ChromaDB.
This means knowledge learned in M1 is immediately available to M2 for hypothesis generation,
M4 for historical context, and M5 for gap-filling — without any explicit data passing.

### GemmaEngine Design
The engine wraps HuggingFace's `InferenceClient` with automatic retry, rate-limit handling,
per-call model switching, and structured JSON output enforcement via `think_json()`.

### Zero-Dependency Fallback
`KnowledgeGraph` includes a pure-Python TF-IDF backend — no ChromaDB required.
This ensures the system works in any environment including Colab with no setup.

## Results

The modular architecture allows each component to be tested independently
and swapped without touching other modules.
