"""character_factory: wizard-draft level resolution (FR-6.2.3)."""

from catalog import character_factory, service


def _draft(**overrides):
    base = {
        "campaign_template_id": "a0000003-0000-4000-8000-000000000002",
        "name": "Nyx Frost",
        "gender": "female",
        "class_id": "mage",
        "race_id": "elf",
        "stats": {"might": -1, "finesse": 0, "wit": 2, "presence": 1},
        "starting_package_id": "tn-mage-frost-elementalist",
    }
    base.update(overrides)
    return base


def test_level_defaults_to_template_level_min():
    pc, _meta = character_factory.character_from_draft(_draft())
    # Touch of the Necromancer's level_min is 1 in the POC seed.
    assert pc.level == 1


def test_level_follows_template_level_min_when_above_one(monkeypatch):
    real_get_template_by_id = service.get_template_by_id

    def fake_get_template_by_id(template_id):
        template = real_get_template_by_id(template_id)
        if template is None:
            return None
        return {**template, "level_min": 3}

    monkeypatch.setattr(character_factory, "get_template_by_id", fake_get_template_by_id)

    pc, _meta = character_factory.character_from_draft(_draft())
    assert pc.level == 3


def test_level_defaults_to_one_when_template_unresolvable(monkeypatch):
    monkeypatch.setattr(character_factory, "get_template_by_id", lambda _id: None)

    pc, _meta = character_factory.character_from_draft(_draft())
    assert pc.level == 1
