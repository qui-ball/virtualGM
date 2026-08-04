"""Playthrough-centric campaign lobby list."""

from api.schemas import CampaignListResponse, CampaignSummary
from catalog.playthrough_store import playthrough_store


def list_campaigns() -> CampaignListResponse:
    """Return the player's playthroughs (empty until POST /active-campaigns)."""
    rows = playthrough_store.list_playthroughs()
    if not rows:
        return CampaignListResponse(campaigns=[])

    # Most recently created is treated as active for lobby highlight
    campaigns: list[CampaignSummary] = []
    for i, pt in enumerate(rows):
        summary = playthrough_store.to_campaign_summary(pt, active=(i == 0))
        campaigns.append(CampaignSummary(**summary))
    return CampaignListResponse(campaigns=campaigns)
