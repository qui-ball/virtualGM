-- Feature 06 catalog seed: ruleset, two fantasy campaigns, packages, prebuilts.
-- Idempotent (ON CONFLICT). Applied by launch.sh after migrations.
--
-- Ability canon:
--   ability_id / starting_ability_id = ruleset codes (WAR-S1, MAG-S1, …)
--   character_data.class_abilities   = engine snake_case (weapon_focus, …)
-- Package ability_id is source of truth for that package; prebuilt.starting_ability_id
-- MUST equal its default_package ability_id.

-- ---------- ruleset ----------
insert into public.rulesets (id, name, version, description, license_type, is_active)
values (
  'a0000001-0000-4000-8000-000000000001',
  'Virtual GM Custom Ruleset',
  '1.0',
  'POC ruleset: warrior, ranger, mage, bard',
  'custom',
  true
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.ruleset_data (ruleset_id, data)
values (
  'a0000001-0000-4000-8000-000000000001',
  '{
    "dice_system": {"types": ["d20", "d10", "d8", "d6", "d4"], "default_roll": "d20"},
    "character_system": {
      "stats": [
        {"name": "might", "abbreviation": "Mig"},
        {"name": "finesse", "abbreviation": "Fin"},
        {"name": "wit", "abbreviation": "Wit"},
        {"name": "presence", "abbreviation": "Pre"}
      ],
      "classes": [
        {"id": "warrior", "name": "Warrior", "hit_die": "d10"},
        {"id": "ranger", "name": "Ranger", "hit_die": "d8"},
        {"id": "mage", "name": "Mage", "hit_die": "d6"},
        {"id": "bard", "name": "Bard", "hit_die": "d8"}
      ],
      "races": [
        {"id": "human", "name": "Human"},
        {"id": "elf", "name": "Elf"},
        {"id": "half-orc", "name": "Half-orc"},
        {"id": "dragonborn", "name": "Dragonborn"}
      ],
      "ability_id_map": {
        "WAR-S1": "weapon_focus",
        "WAR-S2": "tough",
        "WAR-S3": "armored_defense",
        "WAR-S4": "power_strike",
        "RAN-S1": "marksman",
        "RAN-S2": "keen_senses",
        "RAN-S3": "lightfoot",
        "RAN-S4": "favored_terrain",
        "MAG-S1": "arcane_affinity",
        "MAG-S2": "expanded_mana",
        "MAG-S3": "cantrip_mastery",
        "MAG-S4": "scholar",
        "BRD-S1": "silver_tongue",
        "BRD-S2": "inspiring_presence",
        "BRD-S3": "jack_of_all_trades",
        "BRD-S4": "musical_focus"
      }
    }
  }'::jsonb
)
on conflict (ruleset_id) do update set data = excluded.data;

-- ---------- campaign templates ----------
insert into public.campaign_templates (
  id, name, description, publisher, ruleset_id, license_type, summary,
  estimated_sessions, level_range, slug, genre, level_min, level_max,
  content_path, tags, is_public, is_active
)
values
(
  'a0000003-0000-4000-8000-000000000001',
  'Lost Mine of Phandelver',
  'Take up a seemingly harmless delivery job for Gundren, when things almost immediately go sideways, pulling the adventurers into a tangled web of treasure hunting, betrayal, and danger.',
  'Wizards of the Coast (adapted)',
  'a0000001-0000-4000-8000-000000000001',
  'custom',
  'Frontier adventure: goblin ambush, Phandalin intrigue, Cragmaw Castle, Wave Echo Cave.',
  5,
  '1-5',
  'fantasy-lost-mine',
  'fantasy',
  1,
  5,
  'LostMineOfPhandelverAdapted',
  array['fantasy', 'frontier', 'dungeon'],
  true,
  true
),
(
  'a0000003-0000-4000-8000-000000000002',
  'Touch of the Necromancer',
  'Someone you care about is fading under a dark curse. Hunt what you need before the last hour burns out — if you dare.',
  'Virtual GM (sample)',
  'a0000001-0000-4000-8000-000000000001',
  'custom',
  'Dark, time-pressured tale: curse, Hollowbridge, ingredient hunt, ritual outcomes.',
  3,
  '1-3',
  'fantasy-touch-of-the-necromancer',
  'fantasy',
  1,
  3,
  'TouchOfTheNecromancerAdapted',
  array['fantasy', 'dark', 'curse'],
  true,
  true
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  summary = excluded.summary,
  slug = excluded.slug,
  genre = excluded.genre,
  level_min = excluded.level_min,
  level_max = excluded.level_max,
  content_path = excluded.content_path,
  tags = excluded.tags,
  is_public = excluded.is_public,
  is_active = excluded.is_active,
  estimated_sessions = excluded.estimated_sessions,
  level_range = excluded.level_range;

-- Chapters align with adapted filesystem parts (progress / lobby metadata).
insert into public.campaign_chapters (
  id, campaign_template_id, chapter_number, name, summary
)
values
  ('a0000004-0000-4000-8000-000000000001', 'a0000003-0000-4000-8000-000000000001', 1, 'Goblin Arrows', 'Ambush on the Triboar Trail; Cragmaw hideout; rescue Sildar.'),
  ('a0000004-0000-4000-8000-000000000002', 'a0000003-0000-4000-8000-000000000001', 2, 'Phandalin', 'Town politics and the Redbrand threat.'),
  ('a0000004-0000-4000-8000-000000000003', 'a0000003-0000-4000-8000-000000000001', 3, 'The Spider''s Web', 'Optional leads; Cragmaw Castle; rescue Gundren; map to the mine.'),
  ('a0000004-0000-4000-8000-000000000004', 'a0000003-0000-4000-8000-000000000001', 4, 'Wave Echo Cave', 'Clear the mine; defeat Nezznar at the Forge of Spells.'),
  ('a0000004-0000-4000-8000-000000000011', 'a0000003-0000-4000-8000-000000000002', 1, 'Prologue', 'Shrine ritual; Sera takes the curse; travel to Hollowbridge.'),
  ('a0000004-0000-4000-8000-000000000012', 'a0000003-0000-4000-8000-000000000002', 2, 'Dragon Scale', 'Evaine, Aldric, Torval; Northreach errand or lizardman substitute.'),
  ('a0000004-0000-4000-8000-000000000013', 'a0000003-0000-4000-8000-000000000002', 3, 'Mercury', 'Vesper; abandoned mine; undead; purity.'),
  ('a0000004-0000-4000-8000-000000000014', 'a0000003-0000-4000-8000-000000000002', 4, 'Mandrake', 'Mara or elven forest; purity risks.'),
  ('a0000004-0000-4000-8000-000000000015', 'a0000003-0000-4000-8000-000000000002', 5, 'Return', 'Aldric''s ritual and endings.')
on conflict (id) do update set
  name = excluded.name,
  summary = excluded.summary,
  chapter_number = excluded.chapter_number;

-- ---------- starting packages (Lost Mine) ----------
insert into public.starting_packages (
  id, campaign_template_id, class_id, label, theme, playstyle, ability_id, package_data, sort_order
) values
(
  'lm-warrior-wagon-guard',
  'a0000003-0000-4000-8000-000000000001',
  'warrior',
  'Wagon Guard',
  'Hired steel for Gundren''s supply wagon',
  'Shield wall / durable melee',
  'WAR-S3',
  '{"equipped_weapon":"Longsword","equipped_armor":"Chain Mail","inventory":["Longsword","Shield","Handaxe","Rope","Crowbar","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":[],"armor_evasion_bonus":3,"shield_evasion_bonus":1}'::jsonb,
  1
),
(
  'lm-warrior-goblin-slayer',
  'a0000003-0000-4000-8000-000000000001',
  'warrior',
  'Goblin Slayer',
  'Triboar Trail killer — smash Cragmaw raiders',
  'Heavy damage, aggressive',
  'WAR-S4',
  '{"equipped_weapon":"Greataxe","equipped_armor":"Scale Mail","inventory":["Greataxe","Javelin x4","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":[],"armor_evasion_bonus":2,"shield_evasion_bonus":0}'::jsonb,
  2
),
(
  'lm-ranger-trail-sniper',
  'a0000003-0000-4000-8000-000000000001',
  'ranger',
  'Trail Sniper',
  'Overwatch on the Neverwinter → Phandalin road',
  'Longbow hunter',
  'RAN-S1',
  '{"equipped_weapon":"Longbow","equipped_armor":"Studded Leather","inventory":["Longbow","Shortsword","Arrows x24","Hunter''s Kit","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":[],"armor_evasion_bonus":1,"shield_evasion_bonus":0}'::jsonb,
  1
),
(
  'lm-ranger-cave-scout',
  'a0000003-0000-4000-8000-000000000001',
  'ranger',
  'Cave Scout',
  'Cragmaw hideouts and Wave Echo tunnels',
  'Stealth skirmish / traps',
  'RAN-S3',
  '{"equipped_weapon":"Shortsword","equipped_armor":"Leather","inventory":["Shortsword","Shortbow","Arrows x16","Hunting Trap x2","Chalk","Climbing kit","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":[],"armor_evasion_bonus":1,"shield_evasion_bonus":0}'::jsonb,
  2
),
(
  'lm-mage-ember-elementalist',
  'a0000003-0000-4000-8000-000000000001',
  'mage',
  'Ember Elementalist',
  'Fire elementalist — forge-heat and battlefield flame',
  'Elemental damage (fire)',
  'MAG-S1',
  '{"equipped_weapon":"Ashwood staff","equipped_armor":null,"inventory":["Ashwood staff","Spellbook","Charcoal focus","Dagger","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":["Fire Bolt","Shocking Grasp","Light","Shield"],"armor_evasion_bonus":0,"shield_evasion_bonus":0}'::jsonb,
  1
),
(
  'lm-mage-glyph-scholar',
  'a0000003-0000-4000-8000-000000000001',
  'mage',
  'Glyph Scholar',
  'Neverwinter academy — wards, marks, and dungeon lore',
  'Utility / dungeon problem-solving',
  'MAG-S4',
  '{"equipped_weapon":"Dagger","equipped_armor":null,"inventory":["Dagger","Spellbook","Arcane Focus (crystal)","Ink & chalk","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":["Detect Magic","Mage Hand","Arcane Mark","Prestidigitation"],"armor_evasion_bonus":0,"shield_evasion_bonus":0}'::jsonb,
  2
),
(
  'lm-bard-roadhouse-skald',
  'a0000003-0000-4000-8000-000000000001',
  'bard',
  'Roadhouse Skald',
  'Songs for caravan camps and Phandalin''s Stonehill Inn',
  'Ally buff + light melee',
  'BRD-S2',
  '{"equipped_weapon":"Rapier","equipped_armor":"Leather","inventory":["Rapier","Lute","Songbook","Dagger","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":["Healing Word","Inspire","Vicious Mockery"],"armor_evasion_bonus":1,"shield_evasion_bonus":0}'::jsonb,
  1
),
(
  'lm-bard-town-whisper',
  'a0000003-0000-4000-8000-000000000001',
  'bard',
  'Town Whisper',
  'Soft power in Phandalin — townmasters, Redbrands, rumors',
  'Social intrigue',
  'BRD-S1',
  '{"equipped_weapon":"Shortsword","equipped_armor":"Studded Leather","inventory":["Shortsword","Flute","Disguise Kit","Calling cards","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":["Charm","Disguise Self","Message"],"armor_evasion_bonus":1,"shield_evasion_bonus":0}'::jsonb,
  2
)
on conflict (id) do update set
  label = excluded.label,
  theme = excluded.theme,
  playstyle = excluded.playstyle,
  ability_id = excluded.ability_id,
  package_data = excluded.package_data,
  sort_order = excluded.sort_order;

-- ---------- starting packages (Touch of the Necromancer) ----------
insert into public.starting_packages (
  id, campaign_template_id, class_id, label, theme, playstyle, ability_id, package_data, sort_order
) values
(
  'tn-warrior-sisters-shield',
  'a0000003-0000-4000-8000-000000000002',
  'warrior',
  'Sister''s Shield',
  'Protect Sera / hold the line while time burns',
  'Tough frontliner',
  'WAR-S2',
  '{"equipped_weapon":"Warhammer","equipped_armor":"Chain Mail","inventory":["Warhammer","Shield","Holy water vial","Family locket","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":[],"armor_evasion_bonus":3,"shield_evasion_bonus":1}'::jsonb,
  1
),
(
  'tn-warrior-gravewarden',
  'a0000003-0000-4000-8000-000000000002',
  'warrior',
  'Gravewarden',
  'Break bones and shatter undead in the mercury mine',
  'Crushing weapons, undead-focused',
  'WAR-S1',
  '{"equipped_weapon":"Morningstar","equipped_armor":"Scale Mail","inventory":["Morningstar","Torch x4","Silvered dagger","Crowbar","Explorer''s Pack","Waterskin","Bedroll","Rations x3"],"gold":10,"spells_known":[],"armor_evasion_bonus":2,"shield_evasion_bonus":0}'::jsonb,
  2
),
(
  'tn-ranger-curse-tracker',
  'a0000003-0000-4000-8000-000000000002',
  'ranger',
  'Curse Tracker',
  'Follow Malachara''s trail / find ingredient sources',
  'Tracking + mid-range bow',
  'RAN-S2',
  '{"equipped_weapon":"Shortbow","equipped_armor":"Studded Leather","inventory":["Shortbow","Shortsword","Arrows x20","Tracking journal","Herbalism Kit","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":[],"armor_evasion_bonus":1,"shield_evasion_bonus":0}'::jsonb,
  1
),
(
  'tn-ranger-mine-shadow',
  'a0000003-0000-4000-8000-000000000002',
  'ranger',
  'Mine Shadow',
  'Silent work in abandoned mercury shafts among the undead',
  'Stealth skirmish in darkness',
  'RAN-S3',
  '{"equipped_weapon":"Shortsword","equipped_armor":"Leather","inventory":["Shortsword","Shortbow","Arrows x15","Dark lantern","Soft boots","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":[],"armor_evasion_bonus":1,"shield_evasion_bonus":0}'::jsonb,
  2
),
(
  'tn-mage-frost-elementalist',
  'a0000003-0000-4000-8000-000000000002',
  'mage',
  'Frost Elementalist',
  'Ice elementalist — cold that slows rot and undead',
  'Elemental damage / control (cold)',
  'MAG-S1',
  '{"equipped_weapon":"Frost-rimed staff","equipped_armor":null,"inventory":["Frost-rimed staff","Spellbook","Ice crystal focus","Dagger","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":["Frost Ray","Ray of Frost","Shield","Mage Hand"],"armor_evasion_bonus":0,"shield_evasion_bonus":0}'::jsonb,
  1
),
(
  'tn-mage-binding-adept',
  'a0000003-0000-4000-8000-000000000002',
  'mage',
  'Binding Adept',
  'Grey lore — sense and study necromantic bindings',
  'Detection / utility for the ritual path',
  'MAG-S4',
  '{"equipped_weapon":"Dagger","equipped_armor":null,"inventory":["Dagger","Spellbook","Arcane Focus (bone charm)","Salt pouch","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":["Detect Magic","Light","Prestidigitation","Magic Missile"],"armor_evasion_bonus":0,"shield_evasion_bonus":0}'::jsonb,
  2
),
(
  'tn-bard-vigil-singer',
  'a0000003-0000-4000-8000-000000000002',
  'bard',
  'Vigil Singer',
  'Songs to keep Sera''s spirit (and the party) going as the clock ticks',
  'Healing / morale support',
  'BRD-S2',
  '{"equipped_weapon":"Shortsword","equipped_armor":"Leather","inventory":["Shortsword","Lyre","Rest hymns booklet","Healing draught","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":["Healing Word","Song of Rest","Inspire"],"armor_evasion_bonus":1,"shield_evasion_bonus":0}'::jsonb,
  1
),
(
  'tn-bard-hollowbridge-voice',
  'a0000003-0000-4000-8000-000000000002',
  'bard',
  'Hollowbridge Voice',
  'Local ties — Evaine, Torval, Vesper, Mara; bargain for ingredients',
  'Social / information',
  'BRD-S1',
  '{"equipped_weapon":"Rapier","equipped_armor":"Studded Leather","inventory":["Rapier","Mandolin","Letter of introduction","Disguise Kit","Explorer''s Pack","Waterskin","Bedroll","Rations x3","Torch x2"],"gold":10,"spells_known":["Charm","Friends","Guidance"],"armor_evasion_bonus":1,"shield_evasion_bonus":0}'::jsonb,
  2
)
on conflict (id) do update set
  label = excluded.label,
  theme = excluded.theme,
  playstyle = excluded.playstyle,
  ability_id = excluded.ability_id,
  package_data = excluded.package_data,
  sort_order = excluded.sort_order;

-- ---------- prebuilts (Lost Mine) — full CharacterState-shaped character_data ----------
-- HP = 10 + Might (+2 if WAR-S2). Eva = 10 + Finesse + armor + shield.
-- Mage mana = 5 + Wit. Bard mana = 4 + Presence.
insert into public.prebuilt_characters (
  id, campaign_template_id, class_id, name_male, name_female, level, race_id,
  default_package_id, starting_ability_id, character_data, hook, sort_order
) values
(
  'a0000005-0000-4000-8000-000000000001',
  'a0000003-0000-4000-8000-000000000001',
  'warrior',
  'Aldric of Corlinn Hill',
  'Elara of Corlinn Hill',
  1,
  'human',
  'lm-warrior-wagon-guard',
  'WAR-S3',
  '{
    "stats": {"might": 2, "finesse": 1, "wit": 0, "presence": -1},
    "hp": 12, "hp_max": 12,
    "evasion": 15,
    "mana": null, "mana_max": null,
    "xp": 0, "gold": 10, "conditions": [],
    "class_abilities": ["armored_defense"],
    "spells_known": [],
    "equipped_weapon": "Longsword",
    "equipped_armor": "Chain Mail",
    "inventory": ["Longsword", "Shield", "Handaxe", "Rope", "Crowbar", "Explorer''s Pack", "Waterskin", "Bedroll", "Rations x3", "Torch x2"],
    "starting_package_id": "lm-warrior-wagon-guard",
    "ability_id": "WAR-S3"
  }'::jsonb,
  'Noble heir seeking to civilize the frontier',
  1
),
(
  'a0000005-0000-4000-8000-000000000002',
  'a0000003-0000-4000-8000-000000000001',
  'ranger',
  'Kael Bramblefoot',
  'Mira Bramblefoot',
  1,
  'elf',
  'lm-ranger-trail-sniper',
  'RAN-S1',
  '{
    "stats": {"might": 0, "finesse": 2, "wit": 1, "presence": -1},
    "hp": 10, "hp_max": 10,
    "evasion": 13,
    "mana": null, "mana_max": null,
    "xp": 0, "gold": 10, "conditions": [],
    "class_abilities": ["marksman"],
    "spells_known": [],
    "equipped_weapon": "Longbow",
    "equipped_armor": "Studded Leather",
    "inventory": ["Longbow", "Shortsword", "Arrows x24", "Hunter''s Kit", "Explorer''s Pack", "Waterskin", "Bedroll", "Rations x3", "Torch x2"],
    "starting_package_id": "lm-ranger-trail-sniper",
    "ability_id": "RAN-S1"
  }'::jsonb,
  'Scout who knows every trail to Phandalin',
  2
),
(
  'a0000005-0000-4000-8000-000000000003',
  'a0000003-0000-4000-8000-000000000001',
  'mage',
  'Silas Emberquill',
  'Lyra Emberquill',
  1,
  'dragonborn',
  'lm-mage-ember-elementalist',
  'MAG-S1',
  '{
    "stats": {"might": -1, "finesse": 0, "wit": 2, "presence": 1},
    "hp": 9, "hp_max": 9,
    "evasion": 10,
    "mana": 7, "mana_max": 7,
    "xp": 0, "gold": 10, "conditions": [],
    "class_abilities": ["arcane_affinity"],
    "spells_known": ["Fire Bolt", "Shocking Grasp", "Light", "Shield"],
    "equipped_weapon": "Ashwood staff",
    "equipped_armor": null,
    "inventory": ["Ashwood staff", "Spellbook", "Charcoal focus", "Dagger", "Explorer''s Pack", "Waterskin", "Bedroll", "Rations x3", "Torch x2"],
    "starting_package_id": "lm-mage-ember-elementalist",
    "ability_id": "MAG-S1"
  }'::jsonb,
  'Neverwinter apprentice hired for the Rockseeker claim',
  3
),
(
  'a0000005-0000-4000-8000-000000000004',
  'a0000003-0000-4000-8000-000000000001',
  'bard',
  'Finn Harpsong',
  'Wren Harpsong',
  1,
  'half-orc',
  'lm-bard-roadhouse-skald',
  'BRD-S2',
  '{
    "stats": {"might": -1, "finesse": 1, "wit": 0, "presence": 2},
    "hp": 9, "hp_max": 9,
    "evasion": 12,
    "mana": 6, "mana_max": 6,
    "xp": 0, "gold": 10, "conditions": [],
    "class_abilities": ["inspiring_presence"],
    "spells_known": ["Healing Word", "Inspire", "Vicious Mockery"],
    "equipped_weapon": "Rapier",
    "equipped_armor": "Leather",
    "inventory": ["Rapier", "Lute", "Songbook", "Dagger", "Explorer''s Pack", "Waterskin", "Bedroll", "Rations x3", "Torch x2"],
    "starting_package_id": "lm-bard-roadhouse-skald",
    "ability_id": "BRD-S2"
  }'::jsonb,
  'Road performer with debts waiting in Phandalin',
  4
)
on conflict (campaign_template_id, class_id) do update set
  name_male = excluded.name_male,
  name_female = excluded.name_female,
  race_id = excluded.race_id,
  default_package_id = excluded.default_package_id,
  starting_ability_id = excluded.starting_ability_id,
  character_data = excluded.character_data,
  hook = excluded.hook,
  sort_order = excluded.sort_order;

-- ---------- prebuilts (Touch of the Necromancer) ----------
insert into public.prebuilt_characters (
  id, campaign_template_id, class_id, name_male, name_female, level, race_id,
  default_package_id, starting_ability_id, character_data, hook, sort_order
) values
(
  'a0000005-0000-4000-8000-000000000011',
  'a0000003-0000-4000-8000-000000000002',
  'warrior',
  'Rowan Ashford',
  'Rena Ashford',
  1,
  'human',
  'tn-warrior-sisters-shield',
  'WAR-S2',
  '{
    "stats": {"might": 2, "finesse": 1, "wit": 0, "presence": -1},
    "hp": 14, "hp_max": 14,
    "evasion": 15,
    "mana": null, "mana_max": null,
    "xp": 0, "gold": 10, "conditions": [],
    "class_abilities": ["tough"],
    "spells_known": [],
    "equipped_weapon": "Warhammer",
    "equipped_armor": "Chain Mail",
    "inventory": ["Warhammer", "Shield", "Holy water vial", "Family locket", "Explorer''s Pack", "Waterskin", "Bedroll", "Rations x3", "Torch x2"],
    "starting_package_id": "tn-warrior-sisters-shield",
    "ability_id": "WAR-S2"
  }'::jsonb,
  'Elder sibling desperate to save Sera',
  1
),
(
  'a0000005-0000-4000-8000-000000000012',
  'a0000003-0000-4000-8000-000000000002',
  'ranger',
  'Lir Venn',
  'Lira Venn',
  1,
  'elf',
  'tn-ranger-curse-tracker',
  'RAN-S2',
  '{
    "stats": {"might": 0, "finesse": 2, "wit": 1, "presence": -1},
    "hp": 10, "hp_max": 10,
    "evasion": 13,
    "mana": null, "mana_max": null,
    "xp": 0, "gold": 10, "conditions": [],
    "class_abilities": ["keen_senses"],
    "spells_known": [],
    "equipped_weapon": "Shortbow",
    "equipped_armor": "Studded Leather",
    "inventory": ["Shortbow", "Shortsword", "Arrows x20", "Tracking journal", "Herbalism Kit", "Explorer''s Pack", "Waterskin", "Bedroll", "Rations x3", "Torch x2"],
    "starting_package_id": "tn-ranger-curse-tracker",
    "ability_id": "RAN-S2"
  }'::jsonb,
  'Hollowbridge tracker who senses the curse on the wind',
  2
),
(
  'a0000005-0000-4000-8000-000000000013',
  'a0000003-0000-4000-8000-000000000002',
  'mage',
  'Alden Greythorn',
  'Vespera Greythorn',
  1,
  'human',
  'tn-mage-frost-elementalist',
  'MAG-S1',
  '{
    "stats": {"might": -1, "finesse": 0, "wit": 2, "presence": 1},
    "hp": 9, "hp_max": 9,
    "evasion": 10,
    "mana": 7, "mana_max": 7,
    "xp": 0, "gold": 10, "conditions": [],
    "class_abilities": ["arcane_affinity"],
    "spells_known": ["Frost Ray", "Ray of Frost", "Shield", "Mage Hand"],
    "equipped_weapon": "Frost-rimed staff",
    "equipped_armor": null,
    "inventory": ["Frost-rimed staff", "Spellbook", "Ice crystal focus", "Dagger", "Explorer''s Pack", "Waterskin", "Bedroll", "Rations x3", "Torch x2"],
    "starting_package_id": "tn-mage-frost-elementalist",
    "ability_id": "MAG-S1"
  }'::jsonb,
  'Hedge mage who studied bindings the temple will not touch',
  3
),
(
  'a0000005-0000-4000-8000-000000000014',
  'a0000003-0000-4000-8000-000000000002',
  'bard',
  'Calen Marsh',
  'Callia Marsh',
  1,
  'half-orc',
  'tn-bard-vigil-singer',
  'BRD-S2',
  '{
    "stats": {"might": -1, "finesse": 1, "wit": 0, "presence": 2},
    "hp": 9, "hp_max": 9,
    "evasion": 12,
    "mana": 6, "mana_max": 6,
    "xp": 0, "gold": 10, "conditions": [],
    "class_abilities": ["inspiring_presence"],
    "spells_known": ["Healing Word", "Song of Rest", "Inspire"],
    "equipped_weapon": "Shortsword",
    "equipped_armor": "Leather",
    "inventory": ["Shortsword", "Lyre", "Rest hymns booklet", "Healing draught", "Explorer''s Pack", "Waterskin", "Bedroll", "Rations x3", "Torch x2"],
    "starting_package_id": "tn-bard-vigil-singer",
    "ability_id": "BRD-S2"
  }'::jsonb,
  'Hollowbridge singer who will not let Sera fade alone',
  4
)
on conflict (campaign_template_id, class_id) do update set
  name_male = excluded.name_male,
  name_female = excluded.name_female,
  race_id = excluded.race_id,
  default_package_id = excluded.default_package_id,
  starting_ability_id = excluded.starting_ability_id,
  character_data = excluded.character_data,
  hook = excluded.hook,
  sort_order = excluded.sort_order;

-- ---------- POC owner (no login UI) — backend service-role writes ----------
-- Fixed auth id b0000001-...; public.users looked up by supabase_user_id.
do $$
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    'b0000001-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'poc-owner@virtualgm.local',
    crypt('poc-not-for-login', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"POC Owner"}',
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
exception
  when others then
    raise notice 'POC auth.users seed skipped: %', SQLERRM;
end $$;

insert into public.users (id, supabase_user_id, email, display_name)
select
  'b0000002-0000-4000-8000-000000000001',
  'b0000001-0000-4000-8000-000000000001',
  'poc-owner@virtualgm.local',
  'POC Owner'
where exists (
  select 1 from auth.users where id = 'b0000001-0000-4000-8000-000000000001'
)
on conflict (supabase_user_id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  updated_at = now();
