"""HealthDataProvider adapter interface (section 8 of the product brief).

No provider here talks to a real InBody/Biogram API -- we hold neither vendor's official API
credentials or integration agreement. InBodyProvider/BiogramProvider below are structurally ready
(same interface, own device_name/source tags) but explicitly raise NotImplementedError with a
message pointing at what real integration needs; they exist so swapping in a real client later is a
one-file change, not a rewrite of the callers. MockProvider and ManualProvider (plus CSVProvider) are
the ones that actually work end-to-end today -- see docs/PROVIDERS.md.
"""
from __future__ import annotations
from abc import ABC, abstractmethod

from ..schemas import BodyCompositionMeasurement


class HealthDataProvider(ABC):
    name: str = 'base'

    @abstractmethod
    def get_user_measurements(self, user_id: str) -> list[BodyCompositionMeasurement]:
        ...

    def get_latest_measurement(self, user_id: str) -> BodyCompositionMeasurement | None:
        items = self.get_user_measurements(user_id)
        return items[-1] if items else None

    @abstractmethod
    def import_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        """Take a provider-native raw reading and persist it as a normalized BodyCompositionMeasurement."""
        ...

    @abstractmethod
    def normalize_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        """Pure transform: provider-native dict -> BodyCompositionMeasurement, no side effects."""
        ...


class ProviderNotConfigured(RuntimeError):
    """Raised by a provider that is structurally present but has no real credentials/endpoint
    configured in this environment -- callers surface this as a 501, never a fabricated response."""
