import * as THREE from "three";
import { loadGLB } from "@/game/assets/AssetLoader";

/**
 * Braços de primeira pessoa (Fase V5 — RM-06): rig skinned CC0 (wriks/wrad-arms)
 * com IK analítico de dois ossos por braço, ombros ancorados no espaço da
 * câmera, palma orientada pela própria arma e dedos em curl.
 * Targets chegam em coordenadas de MUNDO; o rig é filho do viewmodel root,
 * então os braços seguem sway/bob/ADS junto com a arma. TS puro, browser-only.
 */

const ARM_SCALE = 0.13;
const ARM_POS = new THREE.Vector3(0, -0.08, 0);
/** Âncoras dos ombros no espaço local do viewmodel (metros, câmera em origem). */
const SHOULDER_R = new THREE.Vector3(0.1, -0.3, -0.05);
const SHOULDER_L = new THREE.Vector3(-0.1, -0.3, -0.15);
const POLE_R = new THREE.Vector3(-0.6, -1, 0.2).normalize();
const POLE_L = new THREE.Vector3(0.6, -1, 0.2).normalize();
/** Curvatura de repouso dos dedos (graus) — mãos fechadas no grip. */
export const CURL_REST = 45;

const FINGER_NAMES = ["index", "middle", "ring", "pinky"] as const;
const DEG = Math.PI / 180;
const AXIS_X = new THREE.Vector3(1, 0, 0);
const THUMB_EULER = new THREE.Quaternion().setFromEuler(new THREE.Euler(20 * DEG, 0, 0));

interface ArmSide {
  shoulder: THREE.Bone;
  bicep: THREE.Bone;
  forearm: THREE.Bone;
  wrist: THREE.Bone;
  socket: THREE.Bone;
  L1: number;
  L2: number;
  pole: THREE.Vector3;
  side: "r" | "l";
}

export interface ArmsPose {
  /** Alvo da palma direita (mundo) — no grip da arma. */
  grip: THREE.Vector3;
  /** Alvo da palma esquerda (mundo) — no handguard/segundo apoio. */
  hold: THREE.Vector3;
  /** Orientação desejada da palma direita (mundo). */
  gripQuat: THREE.Quaternion;
  /** Orientação desejada da palma esquerda (mundo). */
  holdQuat: THREE.Quaternion;
  curlR: number;
  curlL: number;
}

const tmpAnchor = new THREE.Vector3();
const tmpRootPos = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpJp = new THREE.Vector3();

export class Arms {
  private group = new THREE.Group();
  private sides: Partial<Record<"r" | "l", ArmSide>> = {};
  private boneMap = new Map<string, THREE.Bone>();
  private placed = false;
  private disposed = false;

  /** true quando o rig carregou e pode resolver o IK. */
  isReady = false;

  constructor(parent: THREE.Object3D) {
    parent.add(this.group);
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const gltf = await loadGLB("/game-assets/weapons/fps_arms.glb");
      if (this.disposed) return;
      const rig = gltf.scene;
      rig.traverse((o) => {
        if ((o as THREE.Bone).isBone) this.boneMap.set(o.name, o as THREE.Bone);
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.frustumCulled = false;
          m.castShadow = false;
          m.userData["viewmodel"] = true;
        }
      });
      this.group.add(rig);
      this.group.scale.setScalar(ARM_SCALE);
      this.group.position.copy(ARM_POS);

      for (const side of ["r", "l"] as const) {
        const forearm = this.bone(`forearm.${side}`);
        const wrist = this.bone(`wrist.${side}`);
        this.sides[side] = {
          shoulder: this.bone(`shoulder.${side}`),
          bicep: this.bone(`bicep.${side}`),
          forearm,
          wrist,
          socket: this.bone(`socket.${side}`),
          L1: forearm.position.length() * ARM_SCALE,
          L2: wrist.position.length() * ARM_SCALE,
          pole: side === "r" ? POLE_R : POLE_L,
          side,
        };
      }
      this.isReady = true;
    } catch (err) {
      console.warn("[Arms] fps_arms.glb indisponível — jogo segue sem mãos:", err);
    }
  }

  private bone(name: string): THREE.Bone {
    const b = this.boneMap.get(name);
    if (!b) throw new Error(`bone ${name} ausente no rig de braços`);
    return b;
  }

  /**
   * Ancora os ombros nas posições do espaço do viewmodel (uma única vez,
   * com o matrixWorld do root já atualizado; o offset fica gravado no
   * espaço local do rig e acompanha a câmera a partir daí).
   */
  private placeShoulders(root: THREE.Object3D): void {
    root.updateMatrixWorld(true);
    for (const side of ["r", "l"] as const) {
      const s = this.sides[side];
      if (!s) continue;
      const anchor = side === "r" ? SHOULDER_R : SHOULDER_L;
      const targetWorld = tmpAnchor.copy(anchor);
      root.localToWorld(targetWorld);
      const rootBone = s.shoulder.parent;
      if (!rootBone) continue;
      rootBone.updateWorldMatrix(true, false);
      tmpRootPos.setFromMatrixPosition(rootBone.matrixWorld);
      rootBone.getWorldQuaternion(tmpQ);
      s.shoulder.position
        .copy(targetWorld)
        .sub(tmpRootPos)
        .divideScalar(ARM_SCALE)
        .applyQuaternion(tmpQ.invert());
    }
    this.placed = true;
  }

  /** Resolve IK dos dois braços e o curl dos dedos. Chamar após o root atualizar matrixWorld. */
  solve(root: THREE.Object3D, pose: ArmsPose): void {
    if (!this.isReady) return;
    if (!this.placed) this.placeShoulders(root);
    const r = this.sides.r;
    if (r) this.solveArm(r, pose.grip, pose.gripQuat);
    const l = this.sides.l;
    if (l) this.solveArm(l, pose.hold, pose.holdQuat);
    this.setCurl("r", pose.curlR);
    this.setCurl("l", pose.curlL);
  }

  /** IK analítico de dois ossos: cotovelo por lei dos cossenos no plano do pole. */
  private solveArm(s: ArmSide, palmTargetWorld: THREE.Vector3, wantQ: THREE.Quaternion): void {
    const bicep = s.bicep;
    const forearm = s.forearm;
    const wrist = s.wrist;
    bicep.updateWorldMatrix(true, false);
    const S = tmpAnchor.setFromMatrixPosition(bicep.matrixWorld);
    const palmOff = tmpRootPos
      .copy(s.socket.position)
      .multiplyScalar(ARM_SCALE)
      .applyQuaternion(wantQ);
    const W = palmTargetWorld.clone().sub(palmOff);
    const d = W.clone().sub(S);
    const reach = s.L1 + s.L2 - 0.005;
    let len = d.length();
    if (len > reach) {
      d.setLength(reach);
      len = reach;
    }
    const cosT = THREE.MathUtils.clamp(
      (s.L1 * s.L1 + len * len - s.L2 * s.L2) / (2 * s.L1 * len),
      -1,
      1,
    );
    const th = Math.acos(cosT);
    const dHat = d.clone().normalize();
    const axis = new THREE.Vector3().crossVectors(dHat, s.pole);
    if (axis.lengthSq() < 1e-8) axis.set(1, 0, 0);
    axis.normalize();
    const p = new THREE.Vector3().crossVectors(axis, dHat).normalize();
    const E = S.clone()
      .addScaledVector(dHat, Math.cos(th) * s.L1)
      .addScaledVector(p, Math.sin(th) * s.L1);

    // orienta ombro → cotovelo e cotovelo → punho na direção alvo
    const aim = (bone: THREE.Bone, child: THREE.Bone, toWorld: THREE.Vector3): void => {
      bone.updateWorldMatrix(true, false);
      tmpJp.setFromMatrixPosition(bone.matrixWorld);
      bone.parent?.getWorldQuaternion(tmpQ);
      const want = toWorld.clone().sub(tmpJp).normalize().applyQuaternion(tmpQ.invert());
      bone.quaternion.setFromUnitVectors(child.position.clone().normalize(), want);
    };
    aim(bicep, forearm, E);
    bicep.updateWorldMatrix(true, true);
    aim(forearm, wrist, W);
    forearm.updateWorldMatrix(true, false);
    // palma segue a orientação da arma (offset do fit já aplicado pelo chamador)
    wrist.parent?.getWorldQuaternion(tmpQ);
    wrist.quaternion.copy(tmpQ.invert().multiply(wantQ));
    wrist.updateWorldMatrix(true, true);
  }

  /** Curl dos dedos (fechamento do grip), em graus, espelhado por lado. */
  private setCurl(side: "r" | "l", degrees: number): void {
    const s = this.sides[side];
    if (!s) return;
    const curl = degrees * DEG * (side === "r" ? 1 : -1);
    for (const fn of FINGER_NAMES) {
      for (let seg = 1; seg <= 3; seg++) {
        const b = this.boneMap.get(`finger_${fn}${seg}.${side}`);
        if (!b) continue;
        b.quaternion.multiply(
          new THREE.Quaternion().setFromAxisAngle(AXIS_X, curl * (seg === 1 ? 0.55 : 1)),
        );
      }
    }
    const thumb = this.boneMap.get(`finger_thumb1.${side}`);
    if (thumb) thumb.quaternion.multiply(THUMB_EULER);
  }

  dispose(): void {
    this.disposed = true;
    this.group.parent?.remove(this.group);
    this.sides = {};
    this.boneMap.clear();
    this.isReady = false;
    this.placed = false;
  }
}
