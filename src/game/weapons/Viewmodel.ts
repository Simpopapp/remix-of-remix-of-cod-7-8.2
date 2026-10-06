import * as THREE from "three";
import type { WeaponId } from "@/game/data/weapons";
import { Arms, CURL_REST } from "./Arms";

/**
 * Viewmodel em primeira pessoa (Fase V5 — RM-06): armas glTF com braços
 * skinned (IK de dois ossos), idle sway, bob de caminhada, ADS, animação de
 * troca (< 0.5 s), recarga com mãos, kick de disparo. Anexado à câmera do
 * viewmodel (cena separada com FOV próprio); TS puro.
 */

interface VmConfig {
  group: THREE.Group;
  muzzle: THREE.Object3D;
  hip: THREE.Vector3;
  ads: THREE.Vector3;
  /** Pontos de apoio das mãos no espaço local do grupo da arma. */
  grip: THREE.Vector3;
  hold: THREE.Vector3;
  mag: THREE.Vector3;
}

const SWITCH_OUT = 0.2;
const SWITCH_IN = 0.24;
const RELOAD_DIP = 0.16;

function darkMetal(color = 0x1c1f24): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.6 });
}

function box(w: number, h: number, d: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export class Viewmodel {
  private configs = new Map<WeaponId, VmConfig>();
  private root = new THREE.Group();
  private currentId: WeaponId = "rifle";

  private time = 0;
  private switching: { phase: "out" | "in"; t: number; next: WeaponId } | null = null;
  private reloading: { t: number; duration: number } | null = null;

  private kickZ = 0;
  private kickRot = 0;
  private lag = new THREE.Vector2();

  private arms: Arms;
  private lights: THREE.Light[] = [];

  private disposables: Array<{ dispose(): void }> = [];

  private disposed = false;

  private tmpGrip = new THREE.Vector3();
  private tmpHold = new THREE.Vector3();
  private tmpRootQuat = new THREE.Quaternion();

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.buildRifle();
    this.buildPistol();
    for (const id of ["rifle", "pistol"] as const) this.refreshAnchors(id);
    this.root.add(this.configs.get("rifle")!.group);
    camera.add(this.root);
    // filhos da câmera só renderizam se a câmera estiver na cena
    scene.add(camera);
    // V5: iluminação própria da cena de viewmodel (não depende do mundo)
    const hemi = new THREE.HemisphereLight(0x9fb8d9, 0x3a2f26, 0.9);
    const key = new THREE.DirectionalLight(0xfff0dd, 1.5);
    key.position.set(0.5, 0.7, 0.3);
    const keyTarget = new THREE.Object3D();
    keyTarget.position.set(0, 0, -1);
    this.root.add(key, keyTarget);
    key.target = keyTarget;
    this.lights = [hemi, key];
    scene.add(hemi);
    this.disposables.push(hemi);
    // V5: mãos com IK substituem o "vazio" nas empunhaduras assim que carregam
    this.arms = new Arms(this.root);
    // V5: modelos glTF substituem o fallback procedural assim que carregam
    void this.loadGltfWeapon("rifle", "/game-assets/weapons/rifle.glb", 0.82);
    void this.loadGltfWeapon("pistol", "/game-assets/weapons/pistol.glb", 0.24);
  }

  /** Pontos de apoio das mãos derivados da bbox do grupo (funciona para procedural e glTF). */
  private refreshAnchors(id: WeaponId): void {
    const cfg = this.configs.get(id);
    if (!cfg) return;
    const b = new THREE.Box3().setFromObject(cfg.group);
    const size = b.getSize(new THREE.Vector3());
    const h = Math.max(size.y, 1e-3);
    const len = Math.max(size.z, 1e-3);
    const isPistol = id === "pistol";
    const gripY = isPistol ? 0.3 : 0.22;
    const gripZ = isPistol ? 0.45 : 0.18;
    const holdY = isPistol ? 0.35 : 0.45;
    const holdZ = isPistol ? 0.7 : 0.62;
    cfg.grip.set(0, b.min.y + h * gripY, b.max.z - len * gripZ);
    cfg.hold.set(0, b.min.y + h * holdY, b.max.z - len * holdZ);
    cfg.mag.set(0, b.min.y + h * 0.08, b.max.z - len * 0.28);
  }

  /** Troca a malha procedural pelo glTF mantendo hip/ADS/muzzle do slot. */
  private async loadGltfWeapon(id: WeaponId, url: string, length: number): Promise<void> {
    try {
      const { loadGLB } = await import("@/game/assets/AssetLoader");
      const gltf = await loadGLB(url);
      if (this.disposed) return;
      const cfg = this.configs.get(id);
      if (!cfg) return;
      const model = gltf.scene.clone(true);
      // eixo longo do modelo é X → gira para -Z (cano à frente da câmera)
      model.rotation.y = Math.PI / 2;
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = length / Math.max(size.z, 1e-3);
      model.scale.setScalar(scale);
      model.updateMatrixWorld(true);
      box.setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = false;
          m.frustumCulled = false;
          m.userData["viewmodel"] = true;
        }
      });
      const group = new THREE.Group();
      group.name = `vm-${id}-gltf`;
      group.add(model);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, (box.max.y - center.y) * 0.35, box.min.z - center.z);
      group.add(muzzle);
      const wasActive = cfg.group.parent === this.root;
      if (wasActive) {
        this.root.remove(cfg.group);
        this.root.add(group);
      }
      cfg.group = group;
      cfg.muzzle = muzzle;
      this.refreshAnchors(id);
    } catch (err) {
      console.warn(`[Viewmodel] glTF ${id} indisponível, mantendo fallback`, err);
    }
  }

  // ---------- construção procedural ----------

  private buildRifle(): void {
    const group = new THREE.Group();
    const body = darkMetal();
    const gripMat = darkMetal(0x14161a);
    const accent = darkMetal(0x2a2e35);
    this.disposables.push(body, gripMat, accent);

    const receiver = box(0.055, 0.085, 0.34, body);
    group.add(receiver);

    const stock = box(0.045, 0.075, 0.16, gripMat);
    stock.position.set(0, -0.005, 0.26);
    group.add(stock);

    const grip = box(0.04, 0.11, 0.05, gripMat);
    grip.position.set(0, -0.085, 0.11);
    grip.rotation.x = 0.3;
    group.add(grip);

    const mag = box(0.04, 0.15, 0.07, accent);
    mag.position.set(0, -0.1, -0.04);
    mag.rotation.x = 0.12;
    group.add(mag);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.3, 10), accent);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.012, -0.32);
    group.add(barrel);

    const handguard = box(0.05, 0.06, 0.22, gripMat);
    handguard.position.set(0, 0.005, -0.19);
    group.add(handguard);

    const sight = box(0.032, 0.04, 0.05, accent);
    sight.position.set(0, 0.075, -0.06);
    group.add(sight);

    const rearSight = box(0.028, 0.022, 0.02, accent);
    rearSight.position.set(0, 0.075, 0.1);
    group.add(rearSight);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.012, -0.48);
    group.add(muzzle);

    this.trackGeometries(group);
    this.configs.set("rifle", {
      group,
      muzzle,
      hip: new THREE.Vector3(0.24, -0.25, -0.42),
      ads: new THREE.Vector3(0, -0.075, -0.3),
      grip: new THREE.Vector3(),
      hold: new THREE.Vector3(),
      mag: new THREE.Vector3(),
    });
  }

  private buildPistol(): void {
    const group = new THREE.Group();
    const body = darkMetal(0x24272d);
    const gripMat = darkMetal(0x14161a);
    this.disposables.push(body, gripMat);

    const slide = box(0.045, 0.055, 0.24, body);
    slide.position.set(0, 0.025, -0.03);
    group.add(slide);

    const frame = box(0.04, 0.04, 0.19, gripMat);
    frame.position.set(0, -0.02, -0.01);
    group.add(frame);

    const grip = box(0.042, 0.12, 0.06, gripMat);
    grip.position.set(0, -0.085, 0.06);
    grip.rotation.x = 0.22;
    group.add(grip);

    const sight = box(0.012, 0.018, 0.02, body);
    sight.position.set(0, 0.062, -0.12);
    group.add(sight);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0, 0.025, -0.16);
    group.add(muzzle);

    this.trackGeometries(group);
    this.configs.set("pistol", {
      group,
      muzzle,
      hip: new THREE.Vector3(0.2, -0.24, -0.36),
      ads: new THREE.Vector3(0, -0.062, -0.28),
      grip: new THREE.Vector3(),
      hold: new THREE.Vector3(),
      mag: new THREE.Vector3(),
    });
  }

  private trackGeometries(group: THREE.Group): void {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) this.disposables.push(mesh.geometry);
    });
  }

  // ---------- API de animação ----------

  get busySwitching(): boolean {
    return this.switching !== null;
  }

  switchTo(id: WeaponId): void {
    if (id === this.currentId && this.switching === null) return;
    this.switching = { phase: "out", t: 0, next: id };
  }

  startReload(duration: number): void {
    this.reloading = { t: 0, duration };
  }

  cancelReload(): void {
    this.reloading = null;
  }

  fire(): void {
    this.kickZ += 0.035;
    this.kickRot += 0.055;
  }

  getMuzzleWorld(out: THREE.Vector3): THREE.Vector3 {
    const cfg = this.configs.get(this.currentId)!;
    return cfg.muzzle.getWorldPosition(out);
  }

  // ---------- update por frame ----------

  update(
    dt: number,
    moveAmount: number,
    grounded: boolean,
    lookDx: number,
    lookDy: number,
    ads: number,
  ): void {
    this.time += dt;

    // timeline de troca
    if (this.switching) {
      this.switching.t += dt;
      if (this.switching.phase === "out" && this.switching.t >= SWITCH_OUT) {
        this.root.clear();
        this.currentId = this.switching.next;
        this.root.add(this.configs.get(this.currentId)!.group);
        this.switching.phase = "in";
        this.switching.t = 0;
      } else if (this.switching.phase === "in" && this.switching.t >= SWITCH_IN) {
        this.switching = null;
      }
    }

    // kicks com decaimento exponencial
    this.kickZ *= Math.exp(-dt * 14);
    this.kickRot *= Math.exp(-dt * 12);

    // sway de mira (lag do mouse)
    const targetLagX = THREE.MathUtils.clamp(-lookDx * 0.0006, -0.03, 0.03);
    const targetLagY = THREE.MathUtils.clamp(lookDy * 0.0005, -0.03, 0.03);
    this.lag.x += (targetLagX - this.lag.x) * Math.min(1, dt * 9);
    this.lag.y += (targetLagY - this.lag.y) * Math.min(1, dt * 9);

    // idle breathing + bob de caminhada
    const idleX = Math.sin(this.time * 1.3) * 0.0035;
    const idleY = Math.cos(this.time * 2.1) * 0.003;
    const bobAmp = grounded ? moveAmount * 0.013 : 0;
    const bobX = Math.cos(this.time * 7.8) * bobAmp * 0.6;
    const bobY = Math.abs(Math.sin(this.time * 7.8)) * bobAmp;

    const cfg = this.configs.get(this.currentId)!;
    const pos = cfg.hip.clone().lerp(cfg.ads, ads);

    // offsets reduzidos em ADS (mirar estabiliza)
    const swayScale = 1 - ads * 0.85;
    pos.x += (idleX + bobX) * swayScale + this.lag.x * swayScale;
    pos.y += (idleY + bobY) * swayScale + this.lag.y * swayScale;
    pos.z += this.kickZ;

    let rotX = this.kickRot + this.lag.y * 1.2 * swayScale;
    let rotY = this.lag.x * 1.6 * swayScale;

    // rebaixamento/levantamento na troca
    if (this.switching) {
      const dur = this.switching.phase === "out" ? SWITCH_OUT : SWITCH_IN;
      const raw = Math.min(1, this.switching.t / dur);
      const k = this.switching.phase === "out" ? raw : 1 - raw;
      const e = k * k * (3 - 2 * k); // smoothstep
      pos.y -= e * 0.32;
      rotX -= e * 0.65;
    }

    // animação de recarga
    if (this.reloading) {
      this.reloading.t += dt;
      const p = Math.min(1, this.reloading.t / this.reloading.duration);
      const dip = Math.sin(p * Math.PI);
      pos.y -= dip * RELOAD_DIP;
      rotX -= dip * 0.55;
      rotY += dip * 0.18;
    }

    this.root.position.copy(pos);
    this.root.rotation.set(rotX, rotY, 0);

    // ---- mãos: IK resolve os alvos no grip/handguard (V5) ----
    this.root.updateMatrixWorld(true);
    if (this.arms.isReady) {
      const cfgA = this.configs.get(this.currentId)!;
      const grip = this.tmpGrip.copy(cfgA.grip);
      const hold = this.tmpHold.copy(cfgA.hold);
      let curlR = CURL_REST;
      let curlL = CURL_REST;
      if (this.reloading) {
        const p = Math.min(1, this.reloading.t / this.reloading.duration);
        const dip = Math.sin(p * Math.PI);
        // mão direita vai ao carregador e abre os dedos; esquerda amortece
        grip.lerp(cfgA.mag, dip * 0.85);
        curlR = CURL_REST - dip * (CURL_REST - 12);
        hold.y -= dip * 0.015;
      }
      if (this.switching) {
        curlR *= 0.8;
        curlL *= 0.8;
      }
      const rootQuat = this.root.getWorldQuaternion(this.tmpRootQuat);
      const gripW = grip;
      this.root.localToWorld(gripW);
      const holdW = hold;
      this.root.localToWorld(holdW);
      this.arms.solve(this.root, {
        grip: gripW,
        hold: holdW,
        gripQuat: rootQuat,
        holdQuat: rootQuat,
        curlR,
        curlL,
      });
    }
  }

  dispose(): void {
    this.root.parent?.remove(this.root);
    this.arms.dispose();
    for (const light of this.lights) {
      light.parent?.remove(light);
      light.dispose();
    }
    this.lights = [];
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.configs.clear();
  }
}
