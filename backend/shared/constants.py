# shared/constants.py
# GENESIS — System-wide constants

# API
API_VERSION        = "v1"
API_PREFIX         = f"/api/{API_VERSION}"

# Model defaults
DEFAULT_MODEL      = "default"          # alias in GEMMA4_MODELS
DEFAULT_TEMP       = 0.7
DEFAULT_MAX_TOKENS = 1024

# KnowledgeGraph
KG_DEFAULT_COLLECTION  = "knowledge"
KG_MEMORY_COLLECTION   = "memory"
KG_SEARCH_DEFAULT_N    = 5

# M1 ingestion limits
MAX_TEXT_CHARS    = 12_000
MAX_URL_CHARS     =  8_000
WHISPER_SIZE      = "base"

# JWT
JWT_ALGORITHM     = "HS256"
JWT_EXPIRE_HOURS  = 24

# Rate limiting
RATE_LIMIT_PER_MIN = 60

# Celery
CELERY_BROKER_ENV  = "REDIS_URL"
CELERY_RESULT_ENV  = "REDIS_URL"
