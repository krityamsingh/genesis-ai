# tests/integration/test_global_panel.py


class TestExportManager:
    def test_export_kg_json(self, kg_with_data):
        import json
        from global_panel.backend.export_manager import export_kg_json
        raw  = export_kg_json(kg_with_data)
        data = json.loads(raw)
        assert "collections" in data
        assert "exported_at" in data

    def test_export_sessions_csv_empty(self):
        from global_panel.backend.export_manager import export_sessions_csv
        result = export_sessions_csv([])
        assert result == ""

    def test_export_sessions_csv(self):
        from global_panel.backend.export_manager import export_sessions_csv
        sessions = [{"id": "1", "source": "test", "domain": "ml"}]
        result = export_sessions_csv(sessions)
        assert "id" in result
        assert "test" in result


class TestSessionManager:
    def test_get_session(self, kg):
        from global_panel.backend.session_manager import get_session, list_sessions
        mem = get_session("sess_001", kg)
        assert mem.session_id == "sess_001"
        assert "sess_001" in list_sessions()

    def test_clear_session(self, kg):
        from global_panel.backend.session_manager import get_session, clear_session
        mem = get_session("sess_002", kg)
        mem.add_user("test message")
        clear_session("sess_002")
        mem2 = get_session("sess_002", kg)
        assert len(mem2._buffer) == 0
