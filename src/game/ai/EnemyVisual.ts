import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { loadGLB } from "@/game/assets/AssetLoader";

/**
 * Visual skinned do inimigo (Fase V4 — PRD v2 RM-05): Soldier.glb (MIT) com
 * AnimationMixer, blend Idle/Walk/Run por velocidade (time-scale ∝ velocidade),
 * mira aditiva no Spine2, disparo como clip aditivo no braço direito, arma no
 * bone da mão direita e hitboxes por bone com userData { enemyId, zone }.
 * TS puro (sem React) — instanciado pelo Enemy, que mantém FSM/física.
 */

const MODEL_URL = "/game-assets/characters/soldier.glb";
/** Altura alvo do modelo (m) — casca de colisão/IA inalterada. */
const TARGET_HEIGHT = 1.8;

export const BONE = {
  hips: "mixamorig:Hips",
  spine: "mixamorig:Spine",
  spine1: "mixamorig:Spine1",
  spine2: "mixamorig:Spine2",
  neck: "mixamorig:Neck",
  head: "mixamorig:Head",
  rightArm: "mixamorig:RightArm",
  rightForeArm: "mixamorig:RightForeArm",
  rightHand: "mixamorig:RightHand",
  leftArm: "mixamorig:LeftArm",
  leftUpLeg: "mixamorig:LeftUpLeg",
  rightUpLeg: "mixamorig:RightUpLeg",
} as const;

/** Variações de clip de morte (PRD RM-05: 2 variações). */
export const DEATH_VARIANT_COUNT = 2;

export type LocomotionAction = "idle" | "walk" | "run";

/** Ação de locomoção pela velocidade real (m/s). */
export function chooseAction(speed: number): LocomotionAction {
  if (speed < 0.4) return "idle";
  if (speed < 3.2) return "walk";
  return "run";
}

/** Time-scale do clip para os pés coerentes com a velocidade. */
export function timeScaleFor(action: LocomotionAction, speed: number): number {
  if (action === "idle") return 1;
  const ref = action === "walk" ? 1.6 : 5.0;
  return THREE.MathUtils.clamp(speed / ref, 0.6, 1.6);
}

/** Entrada por frame vinda do Enemy (FSM → visual). */
export interface EnemyVisualInput {
  dt: number;
  /** Velocidade horizontal real (m/s). */
  speed: number;
  /** Em combate/cobertura: corpo de perfil e tronco mirando. */
  combat: boolean;
  /** Inclinação vertical da mira (rad, positivo = alvo acima). */
  aimPitch: number;
  /** 0..1 (espera na cobertura). */
  crouch: number;
  /** 0..1 flash de dano. */
  flash: number;
}

interface HitboxSpec {
  bone: string;
  size: [number, number, number];
  offset: [number, number, number];
  zone: "head" | "body";
}

const HITBOXES: HitboxSpec[] = [
  { bone: BONE.head, size: [0.26, 0.28, 0.26], offset: [0, 0.1, 0], zone: "head" },
  { bone: BONE.spine2, size: [0.4, 0.44, 0.26], offset: [0, 0.06, 0], zone: "body" },
  { bone: BONE.spine1, size: [0.36, 0.32, 0.26], offset: [0, -0.1, 0], zone: "body" },
  { bone: BONE.leftUpLeg, size: [0.17, 0.5, 0.17], offset: [0, -0.22, 0], zone: "body" },
  { bone: BONE.rightUpLeg, size: [0.17, 0.5, 0.17], offset: [0, -0.22, 0], zone: "body" },
  { bone: BONE.rightArm, size: [0.13, 0.42, 0.13], offset: [0, -0.18, 0], zone: "body" },
];

// hitboxes compartilhadas entre instâncias (invisíveis, só raycast)
let sharedHitboxGeos: THREE.BoxGeometry[] | null = null;
const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });

function getHitboxGeometries(): THREE.BoxGeometry[] {
  if (!sharedHitboxGeos) {
    sharedHitboxGeos = HITBOXES.map((h) => new THREE.BoxGeometry(...h.size));
  }
  return sharedHitboxGeos;
}

// ---------- arma do inimigo (compacta; modelo real entra na V5) ----------

let sharedGunGeos: THREE.BoxGeometry[] | null = null;

const gunMaterial = new THREE.MeshStandardMaterial({
  color: 0x1c1f22,
  roughness: 0.45,
  metalness: 0.75,
});

function buildGun(): { group: THREE.Group; muzzle: THREE.Object3D } {
  if (!sharedGunGeos) {
    sharedGunGeos = [
      new THREE.BoxGeometry(0.055, 0.1, 0.44), // receiver
      new THREE.BoxGeometry(0.03, 0.03, 0.3), // cano
      new THREE.BoxGeometry(0.05, 0.17, 0.09), // carregador
      new THREE.BoxGeometry(0.045, 0.09, 0.2), // coronha
    ];
  }
  const mat = gunMaterial;
  const group = new THREE.Group();
  const parts: Array<[THREE.BoxGeometry, [number, number, number]]> = [
    [sharedGunGeos[0]!, [0, 0, 0]],
    [sharedGunGeos[1]!, [0, 0.015, -0.33]],
    [sharedGunGeos[2]!, [0, -0.12, 0.06]],
    [sharedGunGeos[3]!, [0, -0.02, 0.28]],
  ];
  for (const [geo, pos] of parts) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.castShadow = true;
    group.add(m);
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.015, -0.5);
  group.add(muzzle);
  return { group, muzzle };
}

// ---------- pose de mira/disparo (constantes de tuning visual) ----------

const AIM_ARM_X = -1.25;
const AIM_FOREARM_X = -0.85;
const SHOOT_RECOIL_X = 0.22;

/** Coleta os bones pelo nome a partir da raiz do modelo clonado. */
function findBones(root: THREE.Object3D): Map<string, THREE.Bone> {
  const map = new Map<string, THREE.Bone>();
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone && o.name) {
      map.set(o.name, o as THREE.Bone);
      // GLTFLoader sanitiza nomes de nós ("mixamorig:Hips" → "mixamorigHips")
      // — indexar também a forma com ":" usada no mapa BONE
      if (o.name.startsWith("mixamorig") && !o.name.includes(":")) {
        map.set(o.name.replace(/^mixamorig/, "mixamorig:"), o as THREE.Bone);
      }
    }
  });
  return map;
}

interface PoseSample {
  quat: Map<string, THREE.Quaternion>;
  pos: Map<string, THREE.Vector3>;
}

function samplePose(bones: Map<string, THREE.Bone>, names: string[]): PoseSample {
  const quat = new Map<string, THREE.Quaternion>();
  const pos = new Map<string, THREE.Vector3>();
  for (const name of names) {
    const b = bones.get(name);
    if (!b) continue;
    quat.set(name, b.quaternion.clone());
    pos.set(name, b.position.clone());
  }
  return { quat, pos };
}

function quatTrack(
  name: string,
  times: number[],
  samples: Array<THREE.Quaternion | undefined>,
): THREE.QuaternionKeyframeTrack | null {
  const values: number[] = [];
  for (const q of samples) {
    if (!q) return null;
    values.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values);
}

export class EnemyVisual {
  /** Grupo anexado ao root do Enemy (posição/rotação dono = Enemy). */
  readonly root = new THREE.Group();
  /** Hitboxes raycastáveis por bone (userData { enemyId, zone }). */
  readonly hitboxes: THREE.Mesh[] = [];
  /** Ponta do cano (válido após ready). */
  readonly muzzle = new THREE.Object3D();
  ready = false;

  private enemyId: number;
  private onReady?: ((boxes: THREE.Mesh[]) => void) | undefined;
  private mixer: THREE.AnimationMixer | null = null;
  private actions: Partial<Record<LocomotionAction, THREE.AnimationAction>> = {};
  private current: LocomotionAction = "idle";
  private shootAction: THREE.AnimationAction | null = null;
  private shootTimer = 0;
  private deathActions: THREE.AnimationAction[] = [];
  private dead = false;
  private materials: THREE.MeshStandardMaterial[] = [];
  private bones: Map<string, THREE.Bone> = new Map();
  private aimWeight = 0;
  private flashIntensity = 0;
  private tmpQ = new THREE.Quaternion();
  private tmpE = new THREE.Euler();
  private loaded = false;

  constructor(enemyId: number, onReady?: (boxes: THREE.Mesh[]) => void) {
    this.enemyId = enemyId;
    this.onReady = onReady;
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const gltf = await loadGLB(MODEL_URL);
      const model = cloneSkeleton(gltf.scene);

      // normaliza escala/ancoragem: pés em y=0, altura alvo
      const box = new THREE.Box3().setFromObject(model);
      const height = Math.max(0.01, box.max.y - box.min.y);
      const scale = TARGET_HEIGHT / height;
      model.scale.setScalar(scale);
      box.setFromObject(model);
      model.position.y -= box.min.y;
      // frente do modelo para +z (contrato do Enemy)
      model.rotation.y = Math.PI;

      model.traverse((o) => {
        const mesh = o as THREE.SkinnedMesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.frustumCulled = false; // bounds de skinned mesh são pouco confiáveis
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const clone = mat.clone();
        mesh.material = clone;
        this.materials.push(clone);
      });

      this.bones = findBones(model);
      this.mixer = new THREE.AnimationMixer(model);

      const clips = gltf.animations;
      const idleClip = clips.find((c) => c.name === "Idle");
      const walkClip = clips.find((c) => c.name === "Walk");
      const runClip = clips.find((c) => c.name === "Run");

      if (idleClip) {
        const a = this.mixer.clipAction(idleClip);
        a.play();
        this.actions.idle = a;
      }
      for (const [key, clip] of [
        ["walk", walkClip],
        ["run", runClip],
      ] as const) {
        if (!clip) continue;
        const a = this.mixer.clipAction(clip);
        a.setEffectiveWeight(0);
        a.play();
        this.actions[key as LocomotionAction] = a;
      }

      // pose de repouso (Idle t=0) como base dos clips autorais
      this.mixer.update(0);
      const rest = samplePose(this.bones, Object.values(BONE));

      this.buildShootClip(rest);
      this.buildDeathClips(rest);

      // arma na mão direita
      const hand = this.bones.get(BONE.rightHand);
      if (hand) {
        const gun = buildGun();
        gun.group.rotation.x = -Math.PI / 2; // cano (+z) alinha com +y do bone
        gun.group.position.set(0, 0.02, 0.03);
        hand.add(gun.group);
        this.muzzle.position.copy(gun.muzzle.position);
        gun.group.add(this.muzzle);
      }

      // hitboxes por bone
      const geos = getHitboxGeometries();
      HITBOXES.forEach((spec, i) => {
        const bone = this.bones.get(spec.bone);
        if (!bone) return;
        const m = new THREE.Mesh(geos[i]!, invisibleMat);
        m.visible = false; // raycast do three ignora visibilidade
        m.position.set(...spec.offset);
        m.userData = { enemyId: this.enemyId, zone: spec.zone };
        bone.add(m);
        this.hitboxes.push(m);
      });

      this.root.add(model);
      this.ready = true;
      this.loaded = true;
      if (this.hitboxes.length > 0) this.onReady?.(this.hitboxes);
    } catch (err) {
      // P1: jogo segue sem visual (FSM/física intactas); warning visível
      console.warn(`[enemy] visual P1 omitido por falha: ${MODEL_URL}`, err);
    }
  }

  /** Clip aditivo de disparo: braço direito levanta/recuaia sobre a locomoção. */
  private buildShootClip(rest: PoseSample): void {
    if (!this.mixer) return;
    const times = [0, 0.09, 0.16, 0.34];
    const mul = (name: string, x: number): THREE.Quaternion | undefined => {
      const q = rest.quat.get(name);
      if (!q) return undefined;
      return q.clone().multiply(this.tmpQ.setFromEuler(this.tmpE.set(x, 0, 0)));
    };
    const tracks = [
      quatTrack(BONE.rightArm, times, [
        rest.quat.get(BONE.rightArm),
        mul(BONE.rightArm, AIM_ARM_X),
        mul(BONE.rightArm, AIM_ARM_X + SHOOT_RECOIL_X),
        rest.quat.get(BONE.rightArm),
      ]),
      quatTrack(BONE.rightForeArm, times, [
        rest.quat.get(BONE.rightForeArm),
        mul(BONE.rightForeArm, AIM_FOREARM_X),
        mul(BONE.rightForeArm, AIM_FOREARM_X),
        rest.quat.get(BONE.rightForeArm),
      ]),
      quatTrack(BONE.spine2, times, [
        rest.quat.get(BONE.spine2),
        mul(BONE.spine2, -0.08),
        mul(BONE.spine2, 0.12),
        rest.quat.get(BONE.spine2),
      ]),
    ].filter((t): t is THREE.QuaternionKeyframeTrack => t !== null);
    if (tracks.length === 0) return;
    const clip = new THREE.AnimationClip("EnemyShoot", 0.34, tracks);
    THREE.AnimationUtils.makeClipAdditive(clip);
    const action = this.mixer.clipAction(clip);
    action.blendMode = THREE.AdditiveAnimationBlendMode;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = false;
    this.shootAction = action;
  }

  /** Clips de morte (2 variações) construídos da pose de repouso. */
  private buildDeathClips(rest: PoseSample): void {
    if (!this.mixer) return;
    const variants: Array<{
      duration: number;
      hipsX: number;
      hipsZ: number;
      spineX: number;
      headX: number;
      dropY: number;
    }> = [
      // v0: cai de costas
      { duration: 1.0, hipsX: -1.45, hipsZ: 0, spineX: 0.25, headX: 0.35, dropY: 0.62 },
      // v1: cai à frente / de lado
      { duration: 1.15, hipsX: 1.5, hipsZ: 0.25, spineX: -0.2, headX: -0.3, dropY: 0.55 },
    ];
    for (const v of variants) {
      const times = [0, v.duration * 0.35, v.duration];
      const hipQ = rest.quat.get(BONE.hips);
      const hipP = rest.pos.get(BONE.hips);
      if (!hipQ || !hipP) return;
      const rot = (x: number, z: number): THREE.Quaternion =>
        hipQ.clone().multiply(this.tmpQ.setFromEuler(this.tmpE.set(x, 0, z)));
      const tracks = [
        quatTrack(BONE.hips, times, [
          hipQ,
          rot(v.hipsX * 0.45, v.hipsZ * 0.5),
          rot(v.hipsX, v.hipsZ),
        ]),
        quatTrack(BONE.spine1, times, [
          rest.quat.get(BONE.spine1),
          rest.quat.get(BONE.spine1),
          rest.quat
            .get(BONE.spine1)
            ?.clone()
            .multiply(this.tmpQ.setFromEuler(this.tmpE.set(v.spineX, 0, 0))),
        ]),
        quatTrack(BONE.head, times, [
          rest.quat.get(BONE.head),
          rest.quat.get(BONE.head),
          rest.quat
            .get(BONE.head)
            ?.clone()
            .multiply(this.tmpQ.setFromEuler(this.tmpE.set(v.headX, 0, 0))),
        ]),
        new THREE.VectorKeyframeTrack(`${BONE.hips}.position`, times, [
          hipP.x,
          hipP.y,
          hipP.z,
          hipP.x,
          Math.max(0.15, hipP.y - v.dropY * 0.4),
          hipP.z,
          hipP.x,
          Math.max(0.12, hipP.y - v.dropY),
          hipP.z,
        ]),
      ].filter((t): t is THREE.KeyframeTrack => t !== null);
      const clip = new THREE.AnimationClip(`EnemyDeath${v.duration}`, v.duration, tracks);
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      this.deathActions.push(action);
    }
  }

  /** Disparo: impulso aditivo no braço/tronco (chamado a cada tiro da rajada). */
  playShoot(): void {
    if (!this.shootAction) return;
    this.shootTimer = 0.34;
    this.shootAction.reset().play();
  }

  /** Morte: toca clip (variação aleatória) e congela no último frame. */
  playDeath(): void {
    if (this.dead) return;
    this.dead = true;
    if (!this.mixer || this.deathActions.length === 0) return;
    for (const a of Object.values(this.actions)) a?.stop();
    this.shootAction?.stop();
    const action = this.deathActions[Math.floor(Math.random() * this.deathActions.length)]!;
    action.reset().fadeIn(0.05).play();
  }

  setDamageFlash(intensity: number): void {
    this.flashIntensity = intensity;
  }

  /** Miro verticalmente (Spine2/Neck aditivos) — chamado após o mixer.update. */
  private applyAim(pitch: number, weight: number): void {
    const spine2 = this.bones.get(BONE.spine2);
    if (spine2) {
      this.tmpQ.setFromEuler(this.tmpE.set(pitch * 0.6 * weight, 0, 0));
      spine2.quaternion.multiply(this.tmpQ);
    }
    const neck = this.bones.get(BONE.neck);
    if (neck) {
      this.tmpQ.setFromEuler(this.tmpE.set(pitch * 0.4 * weight, 0, 0));
      neck.quaternion.multiply(this.tmpQ);
    }
  }

  update(input: EnemyVisualInput): void {
    if (!this.loaded) return;
    const { dt } = input;

    if (this.flashIntensity > 0) {
      this.flashIntensity = Math.max(0, this.flashIntensity - dt * 7);
    }
    const f = input.flash > 0 ? input.flash : this.flashIntensity;
    for (const m of this.materials) {
      m.emissive.setRGB(1, 0.19, 0.12);
      m.emissiveIntensity = f * 0.9;
    }

    this.root.scale.y = 1 - input.crouch * 0.28;

    if (this.dead) {
      this.mixer!.update(dt);
      return;
    }
    if (!this.mixer) return;

    // locomoção: crossfade por velocidade + time-scale ∝ velocidade (RM-05)
    const want = chooseAction(input.speed);
    if (want !== this.current) {
      const from = this.actions[this.current];
      const to = this.actions[want];
      if (from) from.crossFadeTo(to ?? from, 0.25, true);
      this.current = to ? want : this.current;
    }
    const active = this.actions[this.current];
    if (active) active.timeScale = timeScaleFor(this.current, input.speed);

    // impulso de disparo aditivo
    if (this.shootTimer > 0) {
      this.shootTimer -= dt;
      if (this.shootAction) this.shootAction.weight = Math.min(1, this.shootTimer / 0.1);
      if (this.shootTimer <= 0) this.shootAction?.stop();
    }

    this.aimWeight += ((input.combat ? 1 : 0) - this.aimWeight) * Math.min(1, dt * 6);

    this.mixer.update(dt);
    if (this.aimWeight > 0.01) this.applyAim(input.aimPitch, this.aimWeight);
  }

  dispose(): void {
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.root.children[0] ?? this.root);
    for (const m of this.materials) m.dispose();
    this.root.removeFromParent();
  }
}
