// Shared character + campaign state for the prototype
window.RPG = window.RPG || {};

window.RPG.character = {
  name: "Zaelan",
  class: "Mage",
  subclass: "Stormcaller",
  level: 4,
  xp: 680,
  xpNext: 1000,
  stats: { Mig: -1, Fin: 0, Wit: 2, Pre: 1 },
  hp: 18, hpMax: 22,
  mp: 6, mpMax: 9,    // 3 + lv + Pre = 3+4+1=8 → bumped to 9 demo
  evasion: 12,
  initiative: 0,      // Fin
  conditions: [],
  weapons: [
    { name: "Storm Staff", stat: "Wit", dice: "d6", note: "arcane focus" },
    { name: "Dagger", stat: "Fin", dice: "d4", note: "off-hand" },
  ],
  armor: { name: "Robe of Currents", type: "Light", evaBonus: 0, classOk: true },
  spells: [
    { id:"bolt", name: "Voltaic Lance", tier: "Minor", cost: 1, desc: "d20 + Wit vs target Eva. On hit: d6 + Wit lightning damage.", roll: "atk" },
    { id:"shock", name: "Static Snare", tier: "Minor", cost: 1, desc: "Target makes a Fin save (10+Wit). On fail: Restrained until end of next turn." },
    { id:"arc", name: "Arc Surge", tier: "Major", cost: 2, desc: "d20 + Wit vs Eva. Hit: 2d6+Wit lightning, chains to nearest enemy at half." },
    { id:"call", name: "Call the Storm", tier: "Mythic", cost: 3, desc: "Summon a tempest for 3 turns. Each turn: enemies in zone make a Fin save or take d8 lightning.", locked:"Unlocks at Lv 6" },
  ],
  abilities: [
    { name: "Stormborn", lv: 1, desc: "You are immune to lightning damage and ignore difficult terrain caused by water." },
    { name: "Arcane Reservoir", lv: 3, desc: "Once per long rest, regain 1d4+1 MP as a free action." },
    { name: "Chain Reaction", lv: 5, desc: "On a crit with a lightning spell, the bolt arcs to a second target for half damage.", locked:true },
  ],
  inventory: [
    { name: "Healing draught", qty: 2 },
    { name: "Spellbook", qty: 1 },
    { name: "Lantern", qty: 1 },
    { name: "Rations (3 days)", qty: 1 },
  ],
  gold: 24,
  coin_purse: { copper: 12, silver: 8, gold: 24, platinum: 1 },
};

window.RPG.campaigns = [
  { id:"hollow", title:"The Hollow Pact", chapter: 3, time: 37, timeMax: 50, char: "Zaelan", classShort:"Mage·4", lastScene:"Tavern, dusk", active:true },
  { id:"salt", title:"Salt & Smoke", chapter: 1, time: 50, timeMax: 50, char: "Iolan", classShort:"Mage·2", lastScene:"Harbor at dawn" },
  { id:"ribcage", title:"Ribcage Coast", chapter: 5, time: 12, timeMax: 50, char: "Wren", classShort:"Bard·6", lastScene:"Cliff path", pendingLevelUp:true },
];

window.RPG.transcript = [
  { who:"sys", text:"— Chapter 3 · Tavern, dusk · time 37/50 —" },
  { who:"gm", text:"Rain hammers the slate roof. The bandit captain steps from the back room, two crossbows trained on you. \"Drop the satchel — last warning.\"" },
  { who:"you", text:"I draw a line of static along the floorboards toward the puddle at his feet." },
  { who:"sys", text:"WIT CHECK · GM-prompted · DC 13" , prompt:{kind:"check", stat:"Wit", dc:13, label:"Wit check vs trap"} },
  { who:"sys", text:"d20=15 +2 Wit = 17  ✓ pass" },
  { who:"gm", text:"Your bolt finds the puddle. The captain's boots fizz; he stumbles half a step. The crossbowmen exchange a look." },
];

// d20 roll w/ adv/dis
window.RPG.roll = function(opts={}){
  const {adv="norm", mod=0, vs=null, label="d20"} = opts;
  const a = 1 + Math.floor(Math.random()*20);
  const b = 1 + Math.floor(Math.random()*20);
  let nat;
  if (adv==="adv") nat = Math.max(a,b);
  else if (adv==="dis") nat = Math.min(a,b);
  else nat = a;
  const total = nat + mod;
  return { a, b, nat, total, mod, adv, vs, label,
           crit: nat===20, fumble: nat===1,
           pass: vs!=null ? total>=vs : null };
};
