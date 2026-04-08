# global_panel/backend/export_manager.py
from __future__ import annotations
import json, csv, io, time


def export_kg_json(kg) -> str:
    """Dump all KG collections to a JSON string."""
    data = {}
    for col in kg.list_collections():
        results = kg.search(col, "everything", n_results=1000)
        data[col] = results
    return json.dumps({
        "exported_at": int(time.time()),
        "collections": data,
    }, indent=2, ensure_ascii=False)


def export_sessions_csv(sessions: list[dict]) -> str:
    """Convert session list to CSV string."""
    if not sessions:
        return ""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=sessions[0].keys())
    writer.writeheader()
    writer.writerows(sessions)
    return buf.getvalue()
