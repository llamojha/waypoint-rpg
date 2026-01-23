import { describe, it, expect } from "vitest";
import {
  calculateTotalAC,
  calculateEquipmentSkillBonuses,
  getWeaponDamage,
  getEquipmentBonusForSkill,
} from "../equipment";
import type { Equipment, Item } from "@/types";

const emptyEquipment: Equipment = {
  mainHand: null,
  offHand: null,
  head: null,
  chest: null,
  arms: null,
  legs: null,
  cloak: null,
  trinket: null,
};

const leatherArmor: Item = {
  id: "1",
  name: "Leather Tunic",
  type: "armor",
  slot: "chest",
  tags: [],
  description: "",
  stats: { ac: 2 },
};

const ironHelm: Item = {
  id: "2",
  name: "Iron Helm",
  type: "armor",
  slot: "head",
  tags: [],
  description: "",
  stats: { ac: 1 },
};

const thievesGloves: Item = {
  id: "3",
  name: "Thieves' Gloves",
  type: "armor",
  slot: "arms",
  tags: [],
  description: "",
  skillBonuses: { Lockpicking: 2, Pickpocket: 1 },
};

const huntersCloak: Item = {
  id: "4",
  name: "Hunter's Cloak",
  type: "armor",
  slot: "cloak",
  tags: [],
  description: "",
  skillBonuses: { Sneaking: 1, Lockpicking: 1 },
};

const ironSword: Item = {
  id: "5",
  name: "Iron Sword",
  type: "weapon",
  slot: "mainHand",
  tags: [],
  description: "",
  stats: { damage: "1d8" },
};

describe("calculateTotalAC", () => {
  it("returns base AC 10 with no equipment", () => {
    expect(calculateTotalAC(emptyEquipment)).toBe(10);
  });

  it("adds AC from single armor piece", () => {
    const equipment = { ...emptyEquipment, chest: leatherArmor };
    expect(calculateTotalAC(equipment)).toBe(12);
  });

  it("aggregates AC from multiple armor pieces", () => {
    const equipment = { ...emptyEquipment, chest: leatherArmor, head: ironHelm };
    expect(calculateTotalAC(equipment)).toBe(13);
  });

  it("ignores items without AC stat", () => {
    const equipment = { ...emptyEquipment, arms: thievesGloves };
    expect(calculateTotalAC(equipment)).toBe(10);
  });
});

describe("calculateEquipmentSkillBonuses", () => {
  it("returns empty object with no equipment", () => {
    expect(calculateEquipmentSkillBonuses(emptyEquipment)).toEqual({});
  });

  it("returns skill bonuses from single item", () => {
    const equipment = { ...emptyEquipment, arms: thievesGloves };
    expect(calculateEquipmentSkillBonuses(equipment)).toEqual({
      Lockpicking: 2,
      Pickpocket: 1,
    });
  });

  it("aggregates bonuses from multiple items", () => {
    const equipment = { ...emptyEquipment, arms: thievesGloves, cloak: huntersCloak };
    expect(calculateEquipmentSkillBonuses(equipment)).toEqual({
      Lockpicking: 3, // 2 + 1
      Pickpocket: 1,
      Sneaking: 1,
    });
  });
});

describe("getWeaponDamage", () => {
  it("returns 1d4 unarmed when no weapon equipped", () => {
    expect(getWeaponDamage(emptyEquipment)).toBe("1d4");
  });

  it("returns weapon damage notation", () => {
    const equipment = { ...emptyEquipment, mainHand: ironSword };
    expect(getWeaponDamage(equipment)).toBe("1d8");
  });
});

describe("getEquipmentBonusForSkill", () => {
  it("returns 0 for skill with no bonus", () => {
    const equipment = { ...emptyEquipment, arms: thievesGloves };
    expect(getEquipmentBonusForSkill(equipment, "Melee")).toBe(0);
  });

  it("returns bonus for skill with equipment", () => {
    const equipment = { ...emptyEquipment, arms: thievesGloves };
    expect(getEquipmentBonusForSkill(equipment, "Lockpicking")).toBe(2);
  });
});
