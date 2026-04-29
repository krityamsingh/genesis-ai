# admin/backend/dataset_manager.py
from __future__ import annotations
import os


def list_datasets(data_dir: str = "data/raw") -> list[dict]:
    if not os.path.isdir(data_dir):
        return []
    files = []
    for fname in os.listdir(data_dir):
        path = os.path.join(data_dir, fname)
        if os.path.isfile(path):
            files.append({
                "name": fname,
                "size_kb": round(os.path.getsize(path) / 1024, 1),
            })
    return files


def delete_dataset(filename: str, data_dir: str = "data/raw") -> bool:
    path = os.path.join(data_dir, os.path.basename(filename))
    if os.path.isfile(path):
        os.remove(path)
        return True
    return False
