# M6 — Reality Simulation Module

M6 runs complex scenario simulations, models real-world systems, and
synthesises executable simulation code.

## Capabilities

| Method | Description |
|---|---|
| `simulate(scenario)` | Run a natural-language scenario simulation |
| `model_system(description)` | Build a formal system model |
| `run_monte_carlo(model, n)` | Run N Monte Carlo trials |
| `synthesise_code(scenario, lang)` | Generate runnable simulation code |
| `analyse_results(results)` | Statistical analysis of simulation output |

## Quick Start

```python
from genesis import Genesis
g = Genesis(hf_token="hf_...")

# Simulate a scenario
result = g.m6.simulate(
    "A 30% drop in global semiconductor supply affects the EV market "
    "over the next 18 months. Model the cascading effects."
)
print(result["narrative"])
for effect in result["effects"]:
    print(f"[{effect['probability']:.0%}] {effect['description']}")
    print(f"  Timeline: {effect['timeline']}")
    print(f"  Severity: {effect['severity']}/10\n")

# Generate simulation code
code = g.m6.synthesise_code(
    "SIR epidemic model with vaccination rate parameter",
    lang="python"
)
print(code)  # Ready-to-run Python simulation

# Monte Carlo
model = g.m6.model_system("Portfolio with 60% equities, 40% bonds, 5% annual drawdown")
mc = g.m6.run_monte_carlo(model, n=10000)
print(f"10-year success probability: {mc['success_rate']:.0%}")
print(f"Expected final value: ${mc['expected_value']:,.0f}")
```
