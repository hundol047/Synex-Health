"""InBodyProvider: structural placeholder for InBody's official Lookin'Body / API integration.

We do not hold InBody API credentials or an integration agreement in this environment, so this
adapter deliberately does not call any InBody endpoint -- doing so with a made-up URL would present
an unconnected feature as connected, which the product brief explicitly forbids. Every method raises
ProviderNotConfigured with a message describing exactly what real integration would need
(INBODY_API_BASE_URL, INBODY_API_KEY, and InBody's device export format), so main.py can surface a
clean 501 instead of a stack trace, and so wiring the real client later only means filling in the
two HTTP calls below -- the HealthDataProvider interface and normalize_measurement() contract stay
the same as MockProvider/ManualProvider."""
from __future__ import annotations
from ..schemas import BodyCompositionMeasurement
from .base import HealthDataProvider, ProviderNotConfigured

_MSG = ('InBody API integration is not configured. Set INBODY_API_BASE_URL and INBODY_API_KEY, and '
        'connect this class to InBody\'s official device-export/API format, to enable it.')


class InBodyProvider(HealthDataProvider):
    name = 'inbody'

    def get_user_measurements(self, user_id: str) -> list[BodyCompositionMeasurement]:
        raise ProviderNotConfigured(_MSG)

    def import_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        raise ProviderNotConfigured(_MSG)

    def normalize_measurement(self, user_id: str, raw: dict) -> BodyCompositionMeasurement:
        raise ProviderNotConfigured(_MSG)
