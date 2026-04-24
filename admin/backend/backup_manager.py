# admin/backend/backup_manager.py — Real backup (Phase 8)
from __future__ import annotations
import gzip, logging, os, shutil, subprocess, tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

log = logging.getLogger("admin.backup_manager")
BACKUP_DIR = Path(os.getenv("BACKUP_LOCAL_DIR", "/tmp/genesis_backups"))

def run_mongodump(db_uri: str, db_name: str) -> Optional[Path]:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_dir = BACKUP_DIR / f"dump_{ts}"; archive = BACKUP_DIR / f"genesis_{ts}.tar.gz"
    try:
        r = subprocess.run(["mongodump", f"--uri={db_uri}", f"--db={db_name}", f"--out={out_dir}"],
                           capture_output=True, timeout=600)
        if r.returncode != 0: log.error(f"mongodump failed: {r.stderr.decode()}"); return None
        with tempfile.NamedTemporaryFile(delete=False, suffix=".tar") as tf: tar_path = Path(tf.name)
        shutil.make_archive(str(tar_path.with_suffix("")), "tar", str(out_dir))
        with open(str(tar_path), "rb") as fi, gzip.open(str(archive), "wb") as fo: shutil.copyfileobj(fi, fo)
        tar_path.unlink(missing_ok=True); shutil.rmtree(out_dir, ignore_errors=True)
        log.info(f"Backup: {archive} ({archive.stat().st_size//1024}KB)"); return archive
    except FileNotFoundError: log.error("mongodump not found"); return None
    except Exception as e: log.error(f"Backup failed: {e}"); return None

def upload_to_s3(local_path: Path, bucket: str) -> bool:
    try:
        import boto3; s3 = boto3.client("s3")
        s3.upload_file(str(local_path), bucket, f"backups/{local_path.name}")
        log.info(f"Uploaded to s3://{bucket}/backups/{local_path.name}"); return True
    except Exception as e: log.error(f"S3 upload failed: {e}"); return False

def apply_retention(max_files: int = 7) -> None:
    files = sorted(BACKUP_DIR.glob("genesis_*.tar.gz"), reverse=True)
    for f in files[max_files:]: f.unlink(missing_ok=True); log.info(f"Retention: deleted {f.name}")

async def run_backup() -> dict:
    from config.settings import settings
    a = run_mongodump(settings.mongodb_uri, settings.mongodb_db_name)
    if not a: return {"status": "error", "message": "mongodump failed"}
    uploaded = upload_to_s3(a, settings.s3_bucket) if settings.s3_bucket else False
    apply_retention()
    return {"status": "ok", "file": str(a), "size_kb": a.stat().st_size//1024,
            "uploaded": uploaded, "ts": datetime.utcnow().isoformat()}
