# tests/unit/test_m4.py


class TestHistoryReconstructor:
    def test_reconstruct(self, engine, kg):
        from modules.m4_time_reconstruct.history_reconstructor import HistoryReconstructor
        r  = HistoryReconstructor(engine, kg)
        tl = r.reconstruct("artificial intelligence")
        assert tl.topic == "artificial intelligence"
        assert isinstance(tl.events, list)


class TestFutureProjector:
    def test_project(self, engine, kg):
        from modules.m4_time_reconstruct.future_projector import FutureProjector
        p    = FutureProjector(engine, kg)
        proj = p.project("quantum computing")
        assert proj.topic == "quantum computing"
        assert isinstance(proj.scenarios, list)


class TestTimelineRenderer:
    def test_to_ascii(self, engine, kg):
        from modules.m4_time_reconstruct.history_reconstructor import HistoryReconstructor
        from modules.m4_time_reconstruct.timeline_renderer     import TimelineRenderer
        r   = HistoryReconstructor(engine, kg)
        tl  = r.reconstruct("test topic")
        out = TimelineRenderer.to_ascii(tl)
        assert "Timeline:" in out or "TIMELINE:" in out

    def test_to_json(self, engine, kg):
        import json
        from modules.m4_time_reconstruct.history_reconstructor import HistoryReconstructor
        from modules.m4_time_reconstruct.timeline_renderer     import TimelineRenderer
        tl   = HistoryReconstructor(engine, kg).reconstruct("topic")
        data = json.loads(TimelineRenderer.to_json(tl))
        assert "topic" in data and "events" in data


class TestM4Facade:
    def test_history(self, m4):
        out = m4.history("the internet")
        assert isinstance(out, str)

    def test_future(self, m4):
        out = m4.future("renewable energy")
        assert isinstance(out, str)

    def test_run_history(self, m4):
        out = m4.run("history of machine learning")
        assert isinstance(out, str)

    def test_run_future(self, m4):
        out = m4.run("future of AI")
        assert isinstance(out, str)
