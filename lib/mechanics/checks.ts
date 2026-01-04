/**
 * Skill check resolution
 */

export interface CheckResult {
  rolled: number;
  total: number;
  outcome: "success" | "failure";
}

/**
 * Roll a d20 (1-20)
 */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Resolve a skill check against a DC
 */
export function resolveCheck(dc: number, modifier: number): CheckResult {
  const rolled = rollD20();
  const total = rolled + modifier;
  return {
    rolled,
    total,
    outcome: total >= dc ? "success" : "failure",
  };
}
