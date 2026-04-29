# core/dataset_generator.py
import json
import os
from datetime import datetime
from typing import List, Dict
from core.knowledge_graph import KnowledgeGraph

class DatasetGenerator:
    """
    Converts Genesis Knowledge Graph memories into fine-tuning datasets.
    """
    
    def __init__(self, kg: KnowledgeGraph):
        self.kg = kg

    def generate_sft_dataset(self, output_path: str = None) -> str:
        """
        Extracts all documents and formats them for Supervised Fine-Tuning.
        """
        if not output_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"./data/exports/dataset_{timestamp}.jsonl"

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        collections = self.kg.list_collections()
        records_count = 0

        with open(output_path, "w", encoding="utf-8") as f:
            for col_name in collections:
                # Note: This is an abstraction. In a real scenario, we'd iterate 
                # through all IDs. For Chroma, we can use col.get().
                if self.kg._backend == "chromadb":
                    col = self.kg._get_chroma_col(col_name)
                    data = col.get()
                    
                    for doc, meta in zip(data.get("documents", []), data.get("metadatas", [])):
                        # Format for SFT: Simple text completion
                        # You could also format as "Instruction: ... Response: ..."
                        entry = {
                            "text": doc,
                            "metadata": meta,
                            "source_collection": col_name
                        }
                        f.write(json.dumps(entry) + "\n")
                        records_count += 1
                else:
                    # Fallback for TF-IDF store
                    col = self.kg._get_tfidf_col(col_name)
                    for doc_id, doc_data in col._docs.items():
                        entry = {
                            "text": doc_data["text"],
                            "metadata": doc_data["metadata"],
                            "source_collection": col_name
                        }
                        f.write(json.dumps(entry) + "\n")
                        records_count += 1

        print(f"[DatasetGenerator] ✅ Exported {records_count} items to {output_path}")
        return output_path

    def stats(self) -> Dict:
        cols = self.kg.list_collections()
        return {
            "total_collections": len(cols),
            "estimated_records": sum(self.kg.count(c) for c in cols)
        }
