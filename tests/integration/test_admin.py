# tests/integration/test_admin.py
import pytest


class TestAdminBackend:
    def test_system_health(self, engine, kg, memory):
        from admin.backend.health_check import system_health
        result = system_health(kg, engine, memory)
        assert "overall" in result
        assert result["knowledge_graph"] == "ok"

    def test_model_info(self, engine):
        from admin.backend.model_monitor import model_info
        info = model_info(engine)
        assert "model_id" in info

    def test_router_stats(self, router):
        from admin.backend.model_monitor import router_stats
        stats = router_stats(router)
        assert "registered_modules" in stats

    def test_backup_manager_no_persist(self, kg):
        from admin.backend.backup_manager import backup_kg
        result = backup_kg(kg, backup_dir="/tmp/genesis_test_backup")
        assert isinstance(result, str)  # either path or message
