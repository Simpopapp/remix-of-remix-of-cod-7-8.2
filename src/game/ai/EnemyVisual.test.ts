import { describe, expect, it } from "vitest";
import { BONE, chooseAction, DEATH_VARIANT_COUNT, timeScaleFor } from "./EnemyVisual";

/**
 * Fase V4 (RM-05): lógica pura do visual skinned do inimigo. A carga do GLB e
 * o mixer rodam browser-only; aqui validamos os helpers de dados/blend.
 */
describe("EnemyVisual — helpers de locomoção", () => {
  it("escolhe a ação pela velocidade real (m/s)", () => {
    expect(chooseAction(0)).toBe("idle");
    expect(chooseAction(0.39)).toBe("idle");
    expect(chooseAction(0.4)).toBe("walk");
    expect(chooseAction(1.6)).toBe("walk");
    expect(chooseAction(3.19)).toBe("walk");
    expect(chooseAction(3.2)).toBe("run");
    expect(chooseAction(6)).toBe("run");
  });

  it("time-scale é proporcional à velocidade e limitado (pés coerentes)", () => {
    expect(timeScaleFor("idle", 0)).toBe(1);
    // referências do clip: walk 1.6 m/s, run 5 m/s → scale = vel/ref
    expect(timeScaleFor("walk", 3.2)).toBe(1.6); // max clamp (3.2/1.6 = 2)
    expect(timeScaleFor("run", 5)).toBeCloseTo(1, 5);
    // clamps (mínimo evita slow-motion; máximo 1.6×)
    expect(timeScaleFor("walk", 0.8)).toBe(0.6);
    expect(timeScaleFor("walk", 10)).toBe(1.6);
    expect(timeScaleFor("run", 0.1)).toBe(0.6);
    expect(timeScaleFor("run", 20)).toBe(1.6);
  });
});

describe("EnemyVisual — rig e clips autorais", () => {
  it("referencia apenas bones do rig Mixamo do Soldier.glb", () => {
    const names = Object.values(BONE);
    expect(names.length).toBeGreaterThanOrEqual(10);
    for (const name of names) expect(name.startsWith("mixamorig:")).toBe(true);
    // bones críticos para mira/disparo/morte existem no rig
    for (const key of [
      "hips",
      "spine2",
      "head",
      "rightArm",
      "rightForeArm",
      "rightHand",
    ] as const) {
      expect(BONE[key]).toBeTruthy();
    }
  });

  it("tem 2 variações de morte (PRD RM-05)", () => {
    expect(DEATH_VARIANT_COUNT).toBe(2);
  });
});
