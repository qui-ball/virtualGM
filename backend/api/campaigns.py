"""Campaign list for lobby (G9)."""

from api.schemas import CampaignListResponse, CampaignSummary
from game.models import create_player_character, is_pending_level_up


def list_campaigns() -> CampaignListResponse:
    pc = create_player_character()
    zaelan_level = 4
    zaelan_xp = 680

    return CampaignListResponse(
        campaigns=[
            CampaignSummary(
                id="lost-mine",
                name="Lost Mine of Phandelver",
                chapter=1,
                time_current=12,
                time_max=50,
                last_scene="Road to Phandalin",
                character_name=pc.name,
                character_class=pc.character_class,
                level=pc.level,
                pending_level_up=is_pending_level_up(pc.xp, pc.level),
                active=True,
            ),
            CampaignSummary(
                id="sunless-citadel",
                name="The Sunless Citadel",
                chapter=2,
                time_current=28,
                time_max=50,
                last_scene="Grove of Ash",
                character_name="Zaelan",
                character_class="mage",
                level=zaelan_level,
                pending_level_up=is_pending_level_up(zaelan_xp, zaelan_level),
            ),
            CampaignSummary(
                id="cragmaw-hideout",
                name="Cragmaw Hideout",
                chapter=1,
                time_current=5,
                time_max=50,
                last_scene="Cave mouth",
                character_name="Wren",
                character_class="bard",
                level=6,
                pending_level_up=False,
            ),
        ]
    )
