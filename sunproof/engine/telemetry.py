"""Sampling intervals shared by engines; never interpolate across missing observations.

Power samples represent the interval beginning at minute_of_day. Supported regular
cadence is 1..5 minutes. The final sample represents one nominal interval, clipped
at midnight. Missing intervals are excluded from integration and invalidate daily
inferences. Invalid ordering is reported rather than silently sorted.
"""
from collections import Counter


def sample_durations(samples):
    """Return (observed interval minutes, quality reason); no fabricated gap energy."""
    if len(samples) < 2:
        return [0] * len(samples), "insufficient_samples"
    minutes = [s.minute_of_day for s in samples]
    deltas = [b-a for a,b in zip(minutes, minutes[1:])]
    if any(d <= 0 for d in deltas):
        return [0] * len(samples), "unordered_or_duplicate_minutes"
    cadence = Counter(deltas).most_common(1)[0][0]
    if cadence > 5:
        return [0] * len(samples), "unsupported_sparse_cadence"
    durations = [min(d, cadence) for d in deltas] + [min(cadence, 1440-minutes[-1])]
    if any(s.timestamp != f"{s.minute_of_day//60:02d}:{s.minute_of_day%60:02d}" for s in samples):
        return durations, "timestamp_minute_mismatch"
    if any(d != cadence for d in deltas):
        return durations, "irregular_cadence_or_gap"
    if minutes[0] != 0 or minutes[-1]+durations[-1] != 1440:
        return durations, "incomplete_day"
    return durations, "sufficient"


def window_kwh(samples, minutes, attr, sign=1.0):
    durations, _ = sample_durations(samples)
    lo, hi = minutes.start, minutes.stop
    return sum(max(0.0, sign*getattr(s, attr)) *
               max(0, min(s.minute_of_day+d, hi)-max(s.minute_of_day, lo)) / 60
               for s,d in zip(samples, durations))
