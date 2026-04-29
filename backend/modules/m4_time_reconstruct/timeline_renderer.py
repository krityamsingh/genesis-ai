# ============================================================
# modules/m4_time_reconstruct/timeline_renderer.py
# GENESIS M4 — Timeline Renderer
#
# Renders timelines as ASCII art, Markdown, or JSON
# for display in the frontend or notebook.
# ============================================================
from __future__ import annotations
import json
from modules.m4_time_reconstruct.history_reconstructor import HistoricalTimeline
from modules.m4_time_reconstruct.future_projector      import FutureProjection


class TimelineRenderer:
    """Render timelines in multiple output formats."""

    @staticmethod
    def to_markdown(timeline: HistoricalTimeline) -> str:
        lines = [f"# Timeline: {timeline.topic}", f"*{timeline.era_span}*", ""]
        get = TimelineRenderer._get
        for e in sorted(timeline.events, key=lambda x: get(x, "year")):
            lines.append(f"## {get(e, 'year')} — {get(e, 'event')}")
            lines.append(f"> {get(e, 'significance')}")
            actors = get(e, 'actors') or []
            if actors:
                lines.append(f"**Key actors:** {', '.join(actors)}")
            lines.append("")
        lines += ["---", f"**Summary:** {timeline.summary}"]
        return "\n".join(lines)

    @staticmethod
    def _get(e, attr):
        """Get attribute from either a dataclass or a dict."""
        return e.get(attr, "") if isinstance(e, dict) else getattr(e, attr, "")

    @staticmethod
    def to_ascii(timeline: HistoricalTimeline, width: int = 70) -> str:
        lines = [f"{'='*width}", f"  TIMELINE: {timeline.topic}",
                 f"  {timeline.era_span}", f"{'='*width}", ""]
        get = TimelineRenderer._get
        events = sorted(timeline.events, key=lambda x: get(x, "year"))
        for e in events:
            yr = f"[{get(e, 'year')}]".ljust(8)
            lines.append(f"{yr} ▶ {get(e, 'event')}")
            lines.append(f"         {get(e, 'significance')[:60]}")
            lines.append("")
        return "\n".join(lines)

    @staticmethod
    def to_json(timeline: HistoricalTimeline) -> str:
        get = TimelineRenderer._get
        data = {
            "topic":    timeline.topic,
            "era_span": timeline.era_span,
            "summary":  timeline.summary,
            "events": [
                {"year": get(e, "year"), "event": get(e, "event"),
                 "significance": get(e, "significance"),
                 "actors": get(e, "actors") or []}
                for e in timeline.events
            ],
        }
        return json.dumps(data, indent=2, ensure_ascii=False)

    @staticmethod
    def future_to_markdown(proj: FutureProjection) -> str:
        lines = [f"# Future Projection: {proj.topic}", ""]
        emoji = {"high": "🟢", "medium": "🟡", "low": "🔴"}
        for s in proj.scenarios:
            e = emoji.get(s.probability, "⚪")
            lines.append(f"## {e} {s.timeframe} ({s.probability} probability)")
            lines.append(s.description)
            if s.drivers:
                lines.append(f"**Drivers:** {', '.join(s.drivers)}")
            if s.risks:
                lines.append(f"**Risks:** {', '.join(s.risks)}")
            lines.append("")
        if proj.wild_cards:
            lines += ["## 🃏 Wild Cards", *[f"- {w}" for w in proj.wild_cards]]
        return "\n".join(lines)
