# database/mongo.py
# GENESIS — Motor + Beanie MongoDB connection
# Replaces database/db.py
# Call connect_db() once from FastAPI lifespan startup.

from __future__ import annotations

import logging
import os

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from database.models_mongo import (
    User, LoginSession, Conversation, Message,
    ModuleState, PromptLog, OtpCode, RateLimit,
)
from database.training_models_mongo import TrainingJobDoc, TrainedModule

log = logging.getLogger("database.mongo")

_ALL_MODELS = [
    User, LoginSession, Conversation, Message,
    ModuleState, PromptLog, OtpCode, RateLimit,
    # Training system (Section B + C)
    TrainingJobDoc, TrainedModule,
]

_client: AsyncIOMotorClient | None = None


async def connect_db() -> None:
    """
    Connect Motor to MongoDB and initialise Beanie with all Document models.
    Call once during FastAPI lifespan startup.
    """
    global _client

    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name   = os.getenv("MONGO_DB_NAME", "genesis_ai")

    _client = AsyncIOMotorClient(mongo_url)
    await init_beanie(database=_client[db_name], document_models=_ALL_MODELS)

    log.info(f"MongoDB connected: db={db_name}")


async def close_db() -> None:
    """Close the Motor connection. Call during FastAPI lifespan shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
        log.info("MongoDB connection closed.")


def get_client() -> AsyncIOMotorClient:
    """Return the Motor client (for raw collection access if needed)."""
    if _client is None:
        raise RuntimeError("MongoDB not connected. Call connect_db() first.")
    return _client
