# Stage V4 — Inimigos skinned (PRD v2 RM-05)

Status: completed
Date: 2026-10-06

## O que foi entregue
- `src/game/ai/EnemyVisual.ts` — visual skinned do inimigo: Soldier.glb (MIT,
  `public/game-assets/characters/soldier.glb`, 2,1 MB) via `SkeletonUtils.clone`
  por instância, AnimationMixer com clips Idle/Walk/Run, crossfade por
  velocidade (`chooseAction`/`timeScaleFor` — time-scale ∝ velocidade),
  clip aditivo de disparo (braço direito + Spine2) e 2 clips de morte
  autorais (LoopOnce + clampWhenFinished), construídos da pose de repouso
  (Idle t=0).
- Mira: tronco gira para o alvo via Spine2/Neck aditivos ponderados por
  `aimWeight` (combat), pitch passado pelo Enemy (`aimPitch`), agachamento
  via escala Y do root (crouch 0..1), flash de dano por emissive.
- Hitboxes por bone: 6 por inimigo (cabeça, spine2, spine1, coxas, braço)
  com `userData { enemyId, zone }` — contrato com WeaponSystem preservado
  (chegam async via `onReady`; WeaponSystem mantém referências vivas).
- Arma do inimigo no bone RightHand (muzzle real do bone após carregar;
  fallback fixo pré-carregamento em `Enemy.ts`).
- Integração: `Enemy.ts` delega visual (FSM/física intactas) — `playShoot`,
  `playDeath`, `setDamageFlash`, `visual.update({ dt, speed, combat,
  aimPitch, crouch, flash })`; dispose no unmount.
- Manifesto/creditação: soldier.glb registrado em `scripts/assets/manifest.json`
  e `public/game-assets/CREDITS.md`.

## Arquivos / áreas tocadas
- `src/game/ai/EnemyVisual.ts` (novo), `src/game/ai/EnemyVisual.test.ts` (novo)
- `src/game/ai/Enemy.ts` (integração do visual), `scripts/assets/manifest.json`,
  `public/game-assets/characters/soldier.glb`, `public/game-assets/CREDITS.md`

## Gates executados (2026-10-06)
- `bun run build` → exit 0.
- `bunx vitest run` → 52/52 (7 arquivos; inclui `EnemyVisual.test.ts` 4/4).
- `bunx eslint src scripts` → 0 erros (6 warnings pré-existentes em
  `src/components/ui/*`, aceites por convenção AGENTS.md).
- Assets: `scripts/assets/report.json` → 51,7 MB / 120 budget;
  primeiro frame 3,02 MB / 40.
- Playwright `/play` (headless): 0 erros de console / pageerror;
  `soldier.glb` servido e carregado; inspeção via hooks `__obScene`/
  `__obDirector` → 16 SkinnedMesh na cena, 48 hitboxes por bone (6 × 8
  inimigos), 8/8 visuais prontos, ação de animação viva (walk/idle por
  velocidade) e posições de patrol avançando entre duas amostras.
  Evidência dentro do projeto (monitor pode ler): script + saída em
  `docs/planning/evidence/stage-V4/check_anim5.py` (saída esperada descrita
  acima) e screenshots `s0_after_click.png`, `a0.png`, `a2.png`,
  `a4_look.png` no mesmo diretório; originais em `/tmp/browser/v4-phase/`.

## Notas para o monitor
- ROADMAP canónico da v2 é `.opencode/roadmap-proj.md` (Fase V4 marcada);
  `docs/planning/ROADMAP.md` mantém-se como cópia histórica da v1.
- Limitação de ambiente conhecida (PRD §11): headless ~3 fps não mede fps
  (NFR-01) — métrica em desktop real segue pendente para V7.
- A mira no Spine usa aplicação pós-mixer (aditivo) — ver `EnemyVisual.ts`
  (`applyAim`), não clip separado; decisão registrada por pragmatismo
  (uma única amostra de pose de repouso alimenta os clips autorais).
