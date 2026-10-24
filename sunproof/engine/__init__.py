"""SunProof deterministic engines: grid fault, battery optimization, billing reconciliation + pipeline.

Names follow the user spec; the roadmap names (`analyze_battery`, `reconcile_billing`,
`analyze_portfolio`) are kept as aliases for agents B/C.
"""

from sunproof.engine.battery import analyze_battery, analyze_battery_optimization
from sunproof.engine.billing import analyze_billing_reconciliation, reconcile_billing
from sunproof.engine.grid_fault import analyze_grid_fault
from sunproof.engine.pipeline import analyze_household, compute_portfolio_metrics

analyze_portfolio = compute_portfolio_metrics

__all__ = [
    "analyze_grid_fault",
    "analyze_battery_optimization",
    "analyze_battery",
    "analyze_billing_reconciliation",
    "reconcile_billing",
    "analyze_household",
    "compute_portfolio_metrics",
    "analyze_portfolio",
]
