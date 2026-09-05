"""Prototype environmental risk engine for POLARIS.

Thresholds are engineering/demo thresholds for the SIH prototype and are NOT
operational safety limits. Wind speed is normalized to km/h.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Any

@dataclass
class RiskResult:
    level: str
    score: int
    factors: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

def _wind_score(wind_kmh: float) -> tuple[int, str | None]:
    if wind_kmh >= 90: return 4, "extreme wind"
    if wind_kmh >= 70: return 3, "high wind"
    if wind_kmh >= 50: return 2, "strong wind"
    if wind_kmh >= 35: return 1, "elevated wind"
    return 0, None

def _temperature_score(temp_c: float) -> tuple[int, str | None]:
    if temp_c <= -35: return 3, "extreme cold"
    if temp_c <= -25: return 2, "severe cold"
    if temp_c <= -18: return 1, "very cold conditions"
    return 0, None

def _pressure_score(pressure_hpa: float) -> tuple[int, str | None]:
    if pressure_hpa < 945: return 3, "very low pressure"
    if pressure_hpa < 965: return 2, "low pressure"
    if pressure_hpa < 980: return 1, "reduced pressure"
    return 0, None

def _humidity_score(humidity_pct: float) -> tuple[int, str | None]:
    if humidity_pct >= 95: return 1, "very high humidity"
    return 0, None

def calculate_risk(data: dict[str, Any]) -> RiskResult:
    wind = float(data.get("wind_speed", 0) or 0)
    temp = float(data.get("temperature", 0) or 0)
    pressure = float(data.get("pressure", 1013) or 1013)
    humidity = float(data.get("humidity", 0) or 0)
    score = 0
    factors: list[str] = []
    for fn, value in ((_wind_score, wind), (_temperature_score, temp), (_pressure_score, pressure), (_humidity_score, humidity)):
        points, reason = fn(value)
        score += points
        if reason: factors.append(reason)
    if score >= 7: level = "CRITICAL"
    elif score >= 5: level = "HIGH"
    elif score >= 3: level = "WATCH"
    else: level = "NORMAL"
    return RiskResult(level=level, score=score, factors=factors)
