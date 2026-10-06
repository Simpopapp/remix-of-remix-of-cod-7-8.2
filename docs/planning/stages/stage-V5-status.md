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
- Playwright evidence: `/tmp/browser/v5-phase/shots/` (e `docs/planning/evidence/stage-V5/`, shots 01–17 + scripts check_v5b/check_v5c/netprobe). Sequência re-executada pós-remix (2026-10-06) com intro pulado (7,5 s pós-lock); headless a ~3 fps ⇒ ~1 min/screenshot.
- **Achado 1 (regressão pós-remix):** 404 em `http://localhost:8080/__l5e/assets-v1/07e30f49-…/kit_brick.glb` — `src/assets/kit_brick.asset.json` (ponteiro lovable-assets) não é servido no ambiente remixado; o arquivo `public/game-assets/kit/kit_brick.glb` está ausente de `public/game-assets/kit/` (só existem roof/stone/street/trim). RuinedCity depende do ponteiro ⇒ kit brick não carrega. Ação: restaurar/reconverter kit_brick.glb para `public/game-assets/kit/` e trocar o ponteiro por caminho estável (regra AGENTS.md: assets do jogo em `public/game-assets/`).
- **Achado 2:** shot 11 (ADS rifle pós-intro) ainda mostra o overlay de intro/letterbox escuro (timing headless); shots 13–17 registrados. Verificação do close-up ADS segue PENDENTE — executar com quality Baixo ou aguardar desktop real.
- Fit tuning (rifle 0.24,-0.25,-0.42 / pistol 0.2,-0.24,-0.36) mantido; v5fit.html em desktop real.
- V5 segue EM CURSO: gates pendentes = corrigir 404 kit_brick + re-verificar close-up ADS + reporte ao monitor.
