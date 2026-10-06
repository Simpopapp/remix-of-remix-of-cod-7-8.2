# Stage V3 — Cidade destruída (kit modular PBR)
Status: em progresso
Date: 2026-10-06

## Concluído nesta passada
- Assets: kit Quaternius (5 GLB agrupados, 29.9 MB) em `public/game-assets/kit/`
  (kit_brick externo via lovable-assets → `src/assets/kit_brick.asset.json`, 13.8 MB
  acima do limite de commit); 4 props Poly Haven 1k (11.1 MB) em `public/game-assets/props/`.
- `scripts/assets/manifest.json` + `public/game-assets/CREDITS.md` + `build-assets.ts`
  (suporte a assetJson): 51.7 MB / 120 MB total, primeiro frame 3.02 MB / 40 MB ✓.
- `src/game/data/kitManifest.ts`: AABB por módulo gerado dos GLB (fonte única).
- `src/game/data/ruins.ts`: composições declarativas (4 prédios destruídos por
  anéis/lajes com damage plan — skip/tilt/off/drop; 10 cascos inteiros como
  skyline; rua; muros perimetrais + armazém em painéis Metal_Plain_3; telhado
  do armazém em lajes com furos; cabine da torre em painéis; rubble piles,
  decals de fuligem, vergalhões) + `getRuinColliders()` (OBB→AABB do manifesto).
- `src/game/data/props.ts`: substituições do pátio (carros caídos, barreiras PBR,
  pilhas de caixote militar, canteiros; barris cortados por D-03) +
  `getPropColliders()` (colliders coerentes com os novos volumes).
- `src/game/world/RuinedCity.ts`: carga async (loadGLB + cache), instancing por
  módulo (InstancedMesh), entulho determinístico (mulberry32), decals, props,
  luzes dos postes; dispose seguro antes de ready.
- tsconfig: resolveJsonModule para o ponteiro do asset.

## Pendente (próxima passada)
- Integrar em `Level.ts`: remover malhas procedurais (contêineres, caixotes,
  barris, muros, telhado, barreiras, cabine do farol) e chamar createRuinedCity;
  `getLevelColliders()` passa a somar getPropColliders + getRuinColliders.
- Corrigir decal vertical da fachada do prédio A (z 45.85) e conferir ancoragem
  dos props GLB (carro yMin −0.30; caixote −0.10).
- Testes: unit para getPropColliders/getRuinColliders + vitest completo.
- Gates: build + `bunx eslint src scripts` + Playwright /play (0 erros de console,
  4 screenshots em /tmp/browser/v3-phase/) + auditoria traverse (zero BoxGeometry
  de cenário) + reporte ao project monitor.

## Atualização 2026-10-06 (sessão atual)
- [x] Level.ts integrado a createRuinedCity; colliders derivados de dados (props+ruínas+pilares); geometria procedural substituída removida
- [x] Correções em ruins.ts (módulos metal/trim apontavam grupos errados → kit_brick; decals Building A em z=45.85)
- [x] RuinedCity.ts: planters (kit_stone) e AC units (kit_trim) agora posicionados a partir dos módulos reais do kit
- [x] Novo teste src/game/data/ruins.test.ts — vitest 48/48; build OK; eslint src scripts 0 erros (6 warnings pré-existentes em ui/*)
- [x] Playwright /play: pointer lock OK via botão, 0 erros de console; cidade carregada (471 malhas, 470 com texturas PBR); screenshots em /tmp/browser/v3-phase/
- [x] BLOQUEIO RESOLVIDO (2026-10-06): causa raiz era enquadramento — o muro norte
  do pátio (z=26) com 2 bandas Metal_Plain_3 (6 m) ocultava os prédios de 2–3
  pisos em cz 45–49. Correção: banda única y=0 no muro norte (skipIdx/tiltIdx
  preservados), rubble piles de brecha (seed 94–97) e `frustumCulled=false` no
  entulho/vergalhões. Verificação Playwright: prédio A visível do pátio (0,20) e
  do portão (0,22) — /tmp/browser/v3-phase/{1_spawn_view,2_gate_view}.png; kit PBR
  de perto confirmado em 2_near_A.png (tijolo, janela, barreira de concreto,
  entulho). Erro TS (exactOptionalPropertyTypes) no panelRun corrigido.

## Atualização 2026-10-06 (sessão do remix — gates re-executados)
- [x] Gates re-executados do zero (ambiente renovado): vitest 48/48; Playwright
  /play com pointer lock via botão e 0 erros de console.
- [x] Conjunto completo de 5 screenshots em /tmp/browser/v3-phase/ (1_spawn_view,
  2_gate_view, 2_near_A, 2_near_C, 2_near_D) — prédio A visível do portão e de
  perto (tijolo/janelas/entulho/barreira), D de perto (painéis trim + tijolo),
  C com covered_car e painéis caídos. Nota técnica: em headless (~3 fps) a intro
  crane-down leva ~2 min reais; o sinal confiável de fim de intro é a câmera
  chegar na altura dos olhos (`__obCamera.position.y < 5`), não o overlay de texto.
- [x] Auditoria traverse: 191 BoxGeometry na cena — 0 de cenário do kit. Todas
  invisíveis (hitboxes/gatilhos transparentes, `visible=false`) ou pertencentes a
  grupos de gameplay (inimigos/viewmodel/alvos); nenhum módulo do kit usa Box.
- [x] Reporte ao project monitor — OpenCode reinstalado (1.18.34); reavaliação
  executada com gates re-verificados pelo monitor. Novo veredito:
  **concluída** (docs/planning/reports/stage-V3-eval.md, 2026-10-06).
- [ ] FPS em desktop real (NFR-01, headless ~3 fps não mede) — pendência da V7.
