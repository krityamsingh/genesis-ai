# M5 — Intuition Engine Module

M5 applies Bayesian reasoning, fills knowledge gaps with structured inference,
and finds non-obvious cross-domain insights.

## Capabilities

| Method | Description |
|---|---|
| `reason(query, evidence)` | Bayesian update given new evidence |
| `fill_gaps(topic)` | Infer missing knowledge via structured reasoning |
| `cross_domain(a, b)` | Deep cross-domain analogical reasoning |
| `explain(concept, audience)` | Intuitive multi-level explanation |
| `challenge(claim)` | Steel-man and challenge a claim |

## Quick Start

```python
from genesis import Genesis
g = Genesis(hf_token="hf_...")

# Bayesian reasoning
result = g.m5.reason(
    query="Will this drug candidate succeed in Phase 3 trials?",
    evidence=[
        {"fact": "Phase 2 showed 40% improvement over placebo", "weight": 0.8},
        {"fact": "Similar compounds failed in Phase 3 historically", "weight": 0.6},
        {"fact": "FDA fast-tracked the drug", "weight": 0.4},
    ]
)
print(f"Posterior probability: {result['probability']:.0%}")
print(result["reasoning"])

# Fill knowledge gaps
gaps = g.m5.fill_gaps("quantum error correction")
for gap in gaps["gaps"]:
    print(f"Gap: {gap['description']}")
    print(f"Inference: {gap['inferred_answer']}")
    print(f"Confidence: {gap['confidence']:.0%}\n")
```
