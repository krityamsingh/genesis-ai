from api.webhooks.training_webhook import router as training_router
from api.webhooks.alert_webhook    import router as alert_router
__all__ = ["training_router", "alert_router"]
