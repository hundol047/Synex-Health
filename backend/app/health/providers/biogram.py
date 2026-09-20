"""BiogramProvider: structural placeholder for Biogram's official API, same rationale as
providers/inbody.py -- no real Biogram API credentials/agreement exist in this environment, so this
raises ProviderNotConfigured rather than faking a connection. Fill in BIOGRAM_API_BASE_URL /
BIOGRAM_API_KEY and the two HTTP calls below once a real integration is available."""
from __future__ import annotations
from ..schemas import BodyCompositionMeasurement
from .base import HealthDataProvider, ProviderNotConfigured

_MSG = ('Biogram API integration is not configured. Set BIOGRAM_API_BASE_URL and BIOGRAM_API_KEY, '
        'and connect this class to Biogram\'s official API, to enable it.')


class BiogramProvider(HealthDataProvider):
    name = 'biogram'

    def get_user_measurements(self, user_id: str) -> list[BodyCompositionMeasurement]:
        raise ProviderNotConfigured(_MSG)

    def import_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        raise ProviderNotConfigured(_MSG)

    def normalize_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        raise ProviderNotConfigured(_MSG)
