# M1 — Self-Learner Module

The Self-Learner is the core knowledge acquisition and teaching module.
It ingests any source, builds a knowledge graph, and teaches back through
multiple modes: Q&A, quizzes, flashcards, study plans, and hypotheses.

## Capabilities

| Method | Description |
|---|---|
| `learn(source)` | Ingest knowledge from URL, PDF, audio, or plain text |
| `ask(question)` | Answer a question from the knowledge base |
| `teach(topic)` | Generate a beginner-to-expert explanation |
| `quiz(topic, n)` | Generate n multiple-choice questions |
| `flashcards(topic, n)` | Generate n front/back flashcard pairs |
| `study_plan(topic)` | Generate a structured study plan |
| `hypothesis(topic)` | Generate hypotheses based on ingested knowledge |
| `compare(a, b)` | Compare two topics from the knowledge base |
| `gaps(topic)` | Identify knowledge gaps in the ingested content |
| `connections(a, b)` | Find cross-domain connections |
| `summarize(topic)` | Summarize ingested knowledge on a topic |

## Quick Start

```python
from genesis import Genesis

g = Genesis(hf_token="hf_...")

# Ingest knowledge
g.learn("https://en.wikipedia.org/wiki/Transformer_(machine_learning_model)")
g.learn("path/to/attention_paper.pdf")
g.learn("The key insight of transformers is the self-attention mechanism.")

# Ask questions
print(g.ask("What is the difference between encoder and decoder?"))

# Teach at a level
print(g.teach("transformers", level="beginner"))
print(g.teach("multi-head attention", level="advanced"))

# Quiz
quiz = g.quiz("transformer architecture", n=5)
for i, q in enumerate(quiz["questions"], 1):
    print(f"{i}. {q['question']}")
    for letter, opt in q['options'].items():
        print(f"   {letter}) {opt}")
    print(f"   Answer: {q['answer']}\n")

# Flashcards
cards = g.flashcards("attention mechanism", n=10)
for card in cards:
    print(f"Q: {card['front']}")
    print(f"A: {card['back']}\n")

# Hypotheses
hyps = g.hypothesis("transformer scaling")
for h in hyps["hypotheses"]:
    print(f"• {h}")
```

## Source Types

```python
# URL (auto-scrapes and extracts text)
g.learn("https://arxiv.org/abs/1706.03762")

# PDF (extracts text with pypdf)
g.learn("/path/to/paper.pdf")

# Audio (transcribes with Whisper)
g.learn("/path/to/lecture.mp3")

# YouTube (transcribes captions or audio)
g.learn("https://youtube.com/watch?v=...")

# Plain text
g.learn("The transformer model uses positional encodings to...")
```

## API Endpoint

```bash
# Learn
curl -X POST http://localhost:8000/api/v1/core/learn \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "https://arxiv.org/abs/1706.03762", "source_type": "url"}'

# Ask
curl -X POST http://localhost:8000/api/v1/core/ask \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Explain self-attention", "module": "m1"}'
```

## Configuration

In `config/base.yaml`:
```yaml
m1:
  max_chunk_size: 1000       # tokens per knowledge chunk
  overlap: 100               # chunk overlap for context continuity
  similarity_threshold: 0.7  # minimum cosine similarity for retrieval
  top_k: 5                   # number of chunks to retrieve per query
  quiz_difficulty: "mixed"   # easy | medium | hard | mixed
```

## Knowledge Graph

M1 uses ChromaDB as its vector store with TF-IDF as a fallback when
ChromaDB is unavailable. Embeddings are generated via the HuggingFace
`sentence-transformers/all-MiniLM-L6-v2` model.

Each ingested chunk is stored with metadata:
```json
{
  "source": "https://arxiv.org/abs/...",
  "source_type": "url",
  "chunk_index": 3,
  "ingested_at": "2026-04-21T10:00:00Z"
}
```
