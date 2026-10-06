# Stage V5 — Armas e mãos FPS (execução em curso)

Date: 2026-10-06
- Autorização: monitor ACK `stage-V5-monitor-ack.md` (remix ativo).
- `fps_arms.glb` (WRAD ARMS, MIT) copiado em `public/game-assets/weapons/`; CREDITS.md + manifest atualizados (54,19 MB / 120 MB).
- `src/game/weapons/Arms.ts` (νέο): rig IK δυο οστών portado από το `v5fit.html` — shoulders, elbow (law of cosines + pole), wrist, finger curl, `ArmsPose`.
- `Viewmodel.ts`: Arms ενσωματωμένος στο viewmodel root, hand anchors από bbox (grip/hold/mag ανά όπλο), reload offsets (δεξί χέρι στο γέμισμα + curl άνοιγμα), switch curl, λύση ανά frame μετά από `root.updateMatrixWorld(true)`; φωτισμός viewmodel (hemi + directional) και vmScene.
- `Effects.ts`: muzzle flash flipbook — atlas 4 frames procedural (256×64), per-slot texture clone με offset.x animated κατά τη διάρκεια του FLASH_LIFE, frameBase ανά flash.
- `GameCanvas.tsx`: WeaponSystem τώρα με `engine.viewmodelCamera` + `engine.viewmodelScene`.
- `Engine.ts`: `viewmodelScene.environment` synced με PMREM του κόσμου ανά frame.
- Gates: build OK (exit 0) · vitest 52/52 · eslint 0 errors (6 warnings σε src/components/ui/*) · Playwright /play 0 νέα console errors.
- Playwright evidence: `/tmp/browser/v5-phase/shots/` (και `docs/planning/evidence/stage-V5/`). Παρατηρήσεις: τα χέρια/weapon render στο intro (03_ads_rifle.png δείχνει silhouette χεριού κάτω-δεξιά) — το cinematic intro καθυστερεί τα input βήματα, τα shots 05–09 χρειάζονται επανάληψη μετά την παράλειψη του intro (skip/intro-finished) για κλειστό close-up ADS.
- Υπόλοιπο: fit tuning (rifle 0.24,-0.25,-0.42 / pistol 0.2,-0.24,-0.36 διατηρημένα, θα ρυθμιστούν με το v5fit.html σε πραγματικό desktop run), επαλήθευση close-up ADS μετά το intro, αναφορά στο monitor.
