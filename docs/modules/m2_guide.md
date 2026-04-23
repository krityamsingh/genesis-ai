# M2 — Research Accelerator Module

M2 specialises in academic research: parsing papers, generating hypotheses,
finding cross-domain connections, and ranking research significance.

## Capabilities

| Method | Description |
|---|---|
| `parse_paper(source)` | Extract structured data from a research paper |
| `generate_hypotheses(topic)` | Generate novel testable hypotheses |
| `find_connections(topic_a, topic_b)` | Identify cross-domain links |
| `rank_papers(papers)` | Rank papers by novelty and significance |
| `literature_review(topic)` | Synthesise a structured literature review |
| `critique(paper)` | Identify weaknesses and gaps in a paper |

## Quick Start

```python
from genesis import Genesis

g = Genesis(hf_token="hf_...")

# Parse a paper
result = g.m2.parse_paper("https://arxiv.org/abs/1706.03762")
print(result["title"])
print(result["abstract"])
print(result["key_contributions"])
print(result["methodology"])
print(result["limitations"])

# Generate hypotheses
hyps = g.m2.generate_hypotheses("sparse mixture-of-experts transformers")
for h in hyps:
    print(f"[{h['confidence']:.0%}] {h['hypothesis']}")
    print(f"  Rationale: {h['rationale']}\n")

# Cross-domain connections
connections = g.m2.find_connections("protein folding", "transformer attention")
for c in connections:
    print(f"• {c['connection']}")
    print(f"  Strength: {c['strength']}, Type: {c['type']}\n")

# Literature review
review = g.m2.literature_review("contrastive learning")
print(review["overview"])
print(review["key_papers"])
print(review["open_questions"])
```

## Paper Parser Output Schema

```json
{
  "title": "Attention Is All You Need",
  "authors": ["Vaswani", "Shazeer", "Parmar", "..."],
  "year": 2017,
  "venue": "NeurIPS",
  "abstract": "...",
  "key_contributions": ["..."],
  "methodology": "...",
  "datasets": ["WMT 2014 EN-DE", "WMT 2014 EN-FR"],
  "results": "...",
  "limitations": ["..."],
  "future_work": ["..."],
  "citations_count_approx": 90000
}
```
