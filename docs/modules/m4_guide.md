# M4 — Time Reconstruct Module

M4 reconstructs historical timelines, analyses turning points, and projects
future scenarios from ingested knowledge.

## Capabilities

| Method | Description |
|---|---|
| `reconstruct(topic, period)` | Build a structured timeline |
| `analyse_turning_points(timeline)` | Identify pivotal events |
| `project_future(topic, years)` | Generate forward projections |
| `render_timeline(events)` | Return timeline data for visualisation |
| `compare_eras(era_a, era_b)` | Side-by-side era comparison |

## Quick Start

```python
from genesis import Genesis
g = Genesis(hf_token="hf_...")

# Reconstruct a timeline
timeline = g.m4.reconstruct("deep learning", period="2010-2026")
for event in timeline["events"]:
    print(f"{event['year']} — {event['title']}")
    print(f"  Impact: {event['impact_score']}/10")
    print(f"  {event['description']}\n")

# Project future
projection = g.m4.project_future("large language models", years=5)
print(projection["narrative"])
for milestone in projection["milestones"]:
    print(f"~{milestone['year']}: {milestone['prediction']}")
```
