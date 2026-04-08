# admin/backend/backup_manager.py
from __future__ import annotations
import os, shutil, time


def backup_kg(kg, backup_dir: str = "/tmp/genesis_backups") -> str:
    """
    Snapshot the KG persist directory (ChromaDB) to a backup folder.
    Returns the backup path.
    """
    os.makedirs(backup_dir, exist_ok=True)
    ts   = int(time.time())
    dest = os.path.join(backup_dir, f"kg_backup_{ts}")
    src  = getattr(kg, "_persist_dir", None)
    if src and os.path.isdir(src):
        shutil.copytree(src, dest)
        return dest
    return f"[Backup skipped — KG backend={kg._backend} has no persist_dir]"
