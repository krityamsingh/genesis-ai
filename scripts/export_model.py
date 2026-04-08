#!/usr/bin/env python3
"""
scripts/export_model.py — export KG knowledge to JSON.
Usage: python scripts/export_model.py [--output path/to/output.json]
"""
import sys, os, argparse, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.knowledge_graph import KnowledgeGraph
from global_panel.backend.export_manager import export_kg_json


def main():
    parser = argparse.ArgumentParser(description="Export GENESIS KG to JSON")
    parser.add_argument("--output", default="genesis_kg_export.json",
                        help="Output file path")
    parser.add_argument("--persist-dir", default="",
                        help="KG persist directory (leave blank for in-memory)")
    args = parser.parse_args()

    print(f"[Export] Loading KG from '{args.persist_dir or 'in-memory'}'...")
    kg   = KnowledgeGraph(persist_dir=args.persist_dir or None)
    data = export_kg_json(kg)

    with open(args.output, "w", encoding="utf-8") as f:
        f.write(data)

    parsed = json.loads(data)
    total  = sum(len(v) for v in parsed["collections"].values())
    print(f"[Export] Exported {total} documents → {args.output}")


if __name__ == "__main__":
    main()
