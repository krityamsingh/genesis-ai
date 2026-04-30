# tests/unit/test_m6.py


class TestWorldObserver:
    def test_observe(self, engine, kg):
        from modules.m6_reality_sim.world_observer import WorldObserver
        obs      = WorldObserver(engine, kg)
        snapshot = obs.observe("global economy")
        assert snapshot.topic == "global economy"
        assert isinstance(snapshot.state, dict)

    def test_snapshot_to_prompt(self, engine, kg):
        from modules.m6_reality_sim.world_observer import WorldObserver
        obs      = WorldObserver(engine, kg)
        snapshot = obs.observe("climate")
        prompt   = snapshot.to_prompt()
        assert "World State:" in prompt


class TestSimRunner:
    def test_run(self, engine, kg):
        from modules.m6_reality_sim.world_observer import WorldObserver, WorldSnapshot
        from modules.m6_reality_sim.sim_runner     import SimRunner
        snapshot = WorldSnapshot(topic="test", state={"var": "value"})
        runner   = SimRunner(engine)
        result   = runner.run(snapshot, "increase var by 10", n_steps=2)
        assert result.topic == "test"
        assert len(result.steps) == 2

    def test_format(self, engine, kg):
        from modules.m6_reality_sim.world_observer import WorldSnapshot
        from modules.m6_reality_sim.sim_runner     import SimRunner
        snapshot = WorldSnapshot(topic="economy", state={})
        result   = SimRunner(engine).run(snapshot, "recession hits", n_steps=2)
        out = result.format()
        assert "Simulation:" in out


class TestResultsAnalyzer:
    def test_analyse(self, engine, kg):
        from modules.m6_reality_sim.world_observer import WorldSnapshot
        from modules.m6_reality_sim.sim_runner     import SimRunner
        from modules.m6_reality_sim.results_analyzer import ResultsAnalyzer
        snap   = WorldSnapshot(topic="test", state={})
        result = SimRunner(engine).run(snap, "test scenario", n_steps=2)
        out    = ResultsAnalyzer(engine).analyse(result)
        assert isinstance(out, str)


class TestM6Facade:
    def test_run(self, m6):
        out = m6.run("global pandemic spreads")
        assert isinstance(out, str)

    def test_what_if(self, m6):
        out = m6.what_if("stock market", "interest rates rise 5%")
        assert isinstance(out, str)
