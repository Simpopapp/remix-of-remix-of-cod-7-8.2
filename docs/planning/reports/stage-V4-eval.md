# Avaliação — Stage V4

**Data:** 2026-10-06
**Veredito:** concluída
**Confiança da avaliação:** alta

## Resumo executivo

A Fase V4 (inimigos skinned, PRD v2 RM-05, `.opencode/roadmap-proj.md` Fase V4,
`.opencode/prd-project1.md` §5 RM-05 / §8 Fase V4) está **concluída**. O
`EnemyVisual` skinned (`Soldier.glb`, MIT) está implementado exatamente como
descrito no status — mixer com Idle/Walk/Run, crossfade + time-scale por
velocidade, mira aditiva no Spine2/Neck, clip aditivo de disparo, 2 clips de
morte autorais, 6 hitboxes por bone com `userData { enemyId, zone }`, arma no
bone da mão direita — e a integração preserva FSM/física (`Enemy.ts` delega o
visual). O monitor re-executou neste turno os gates estáticos — **vitest
52/52, `bun run build` OK, `bunx eslint src scripts` 0 erros** — e auditou o
contrato de hitboxes ponta a ponta (`EnemyVisual` → `Enemy` → `Director` →
`WeaponSystem`, referências vivas). A recomendação da V3 foi atendida: script
Playwright + screenshots de gate copiados para dentro do projeto
(`docs/planning/evidence/stage-V4/`).

## Cobertura de requisitos

- Atendido (RM-05 núcleo): `src/game/ai/EnemyVisual.ts` (498 linhas) —
  `SkeletonUtils.clone` por instância (`:219`), normalização de escala/ancoragem
  pés-em-y=0 altura 1,8 m (`:221-227`), `AnimationMixer` com clips Idle/Walk/Run
  do GLB (`:246-264`), `chooseAction`/`timeScaleFor` com time-scale ∝ velocidade
  (`:38-49`, testado em `EnemyVisual.test.ts` 4/4), crossfade 0,25 s por
  velocidade (`:469-477`).
- Atendido (mira): tronco gira para o alvo via Spine2/Neck aditivos ponderados
  por `aimWeight` em combat, pitch vindo do Enemy (`:434-445` `applyAim`,
  `:486-489`; `Enemy.ts:582-591` passa `combat`/`aimPitch`/`crouch`/`flash`).
  Decisão pragmática registrada no status (aditivo pós-mixer, sem clip
  separado) — coerente com D-07 (trocar visual atrás de interfaces).
- Atendido (disparo): clip aditivo `EnemyShoot` no braço direito + Spine2
  (`:308-344`, `makeClipAdditive`), `playShoot()` por tiro da rajada
  (`:412-416`, chamado em `Enemy.ts:490`).
- Atendido (morte): 2 variações construídas da pose de repouso, LoopOnce +
  `clampWhenFinished`, corpo permanece (`:347-409`, `DEATH_VARIANT_COUNT = 2`
  em `:33`, `playDeath()` em `:419-427`, chamado em `Enemy.ts:144`).
- Atendido (hit react simplificado): flash de dano por emissive
  (`:451-458`, `setDamageFlash`, `Enemy.ts:156`). Não há clip dedicado de hit
  react — o gate da fase não o exige e o flash cumpre a legibilidade de combate;
  registrado como atenção, não bloqueio.
- Atendido (hitboxes por bone): 6 por inimigo (cabeça/spine2/spine1/coxas/braço)
  com `userData { enemyId, zone }` (`:73-80`, `:286-295`), chegam async via
  `onReady` e o `Enemy` empurra as **mesmas referências** para `hitMeshes`
  (`Enemy.ts:101-105`); `Director` repassa ao array vivo
  (`Director.ts:49-51`); `WeaponSystem` lê `userData["enemyId"]` e monta
  `hitSources` sobre os arrays vivos (`WeaponSystem.ts:105`, `:251-291`).
  Contrato `targetId/zone` da v1 preservado na forma `enemyId/zone` (nomenclatura
  documentada no código; leitor do WeaponSystem confere).
- Atendido (arma no bone): grupo compacto na mão direita com muzzle real após
  carregar (`:275-282`); fallback fixo pré-carregamento em `Enemy.ts:97`
  (`fallbackMuzzle`), comutação em `:495`. Modelo realista fica para V5 por
  decisão explícita (status) — aceitável: D-03 veda blocos para **heróis de
  cenário**, e a arma do inimigo a distância não é o viewmodel herói (RM-06).
- Atendido (manifesto/crédito): `soldier` P1 em `scripts/assets/manifest.json`,
  `Soldier.glb` 2,1 MB em `public/game-assets/characters/` (presente no disco),
  linha MIT em `public/game-assets/CREDITS.md:17`.
- Atendido (gates re-executados pelo monitor neste turno): `bunx vitest run`
  **52/52** (7 ficheiros, inclui `EnemyVisual.test.ts` 4/4); `bun run build`
  OK (exit 0); `bunx eslint src scripts` **0 erros** (6 warnings
  pré-existentes em `src/components/ui/*`, aceites por convenção AGENTS.md);
  `scripts/assets/report.json` → **51,7 MB / 120**, primeiro frame
  **3,02 MB / 40** (dentro do budget D-01).
- Atendido (Playwright declarado pelo builder, consistente com o código):
  0 erros de console/pageerror, `soldier.glb` servido e carregado, 16
  SkinnedMesh, 48 hitboxes (6×8), 8/8 visuais prontos, ação viva walk/idle por
  velocidade e patrol avançando entre duas amostras — via hooks `__obScene`/
  `__obDirector` no script `docs/planning/evidence/stage-V4/check_anim5.py`.
  **Ressalva de prova:** nenhuma saída-console do script foi salva como
  ficheiro (só "saída esperada descrita" no status); a checagem é estrutural,
  não re-executada neste turno (ver Discrepâncias).
- Parcial / não evidenciado (fora do gate V4, RM-05 detalhe): variação de
  2–3 tons de uniforme/capacete — não implementada (material único clonado por
  instância, `:237-240`). O gate da fase (§8 Fase V4) não a exige; fica como
  polish V7.
- Ausente / não evidenciado (pendência V7 conhecida): FPS em desktop real
  (NFR-01; headless ~3 fps não mede — limitação registrada no status).

## Qualidade do código

Pontos fortes:
- Separação D-07 respeitada: `Enemy` mantém FSM/física/contratos públicos;
  o visual é delegado (`playShoot`/`playDeath`/`setDamageFlash`/
  `visual.update(...)`, `dispose` em `Enemy.ts:603`). Nenhum import React em
  `src/game/**`.
- `findBones` tolera a sanitização de nomes do GLTFLoader
  (`mixamorigHips` → `mixamorig:Hips`, `:139-152`) — robustez real contra o
  loader, não otimismo.
- Falha do GLB vira `console.warn` identificado sem quebrar FSM/física
  (`:301-304`, P1 async com fallback de muzzle) — tratamento de erro correto
  para asset P1.
- Helpers puros (`chooseAction`, `timeScaleFor`, `BONE`, `DEATH_VARIANT_COUNT`)
  testáveis sem browser e cobertos (`EnemyVisual.test.ts` 4/4, fronteiras
  0,4/3,2 m/s e clamps 0,6–1,6 verificados).
- `frustumCulled = false` nas skinned meshes (`:235`) — bounds de skinned mesh
  corretos contra o problema de culling já mapeado na V3.

Pontos de atenção (não bloqueantes):
- O script de gate lê `e.visual?.current` e `e.visual?.dead`, que são
  `private` em TS (`EnemyVisual.ts:197-201`) — funciona em runtime (JS não
  impõe `private`), mas é acoplamento a campo interno só para debug. Se a
  classe ganhar getters públicos, atualizar o script.
- Hitboxes e arma usam `BoxGeometry` compartilhado (`getHitboxGeometries`,
  `buildGun`) — **fora** do escopo da vedação V3 (que mirava cenário no
  caminho do `/play`; auditoria V3 já classificou gameplay/debug como exceção).
  Não reintroduz "cenário de caixas".
- `EnemyVisual.ts` tem 498 linhas; se crescer (variações de uniforme, hit
  react), considerar fatiar clips autorais para módulo próprio.
- Crouch via `root.scale.y` (`:460`) deforma o modelo em vez de dobrar
  joelhos — aceitável à distância da V4, mas close-ups futuros (V5+) podem
  expor o truque.

## Discrepâncias

- Nenhuma divergência material entre status e código: medidas conferem
  (498 linhas `EnemyVisual.ts`, 53 linhas de teste 4/4, integração
  `Enemy.ts:55/101-106/144/156/490/495/582-603`, `Director.ts:49-51`,
  `WeaponSystem.ts:105/251-291`, manifesto `soldier` P1, CREDITS:17,
  2,1 MB no disco, gates 52/52 + build OK + eslint 0 erros re-executados aqui).
- Divergência de **prova visual, não de conteúdo**: as 4 imagens em
  `docs/planning/evidence/stage-V4/` (`s0_after_click`, `a0`, `a2`, `a4_look`)
  mostram a cinemática de intro (letterbox + "OPERAÇÃO: BLACKOUT", cena quase
  preta) — **nenhuma mostra o inimigo skinned**. A prova da animação repousa
  na inspeção via hooks (`__obScene`/`__obDirector`) descrita no status, cuja
  saída de console **não foi salva** em ficheiro (só transcrita como "saída
  esperada"). Não invalida o veredito (o código sustenta cada número alegado:
  6 hitboxes × 8 inimigos = 48; clips Idle/Walk/Run + shoot + 2 mortes
  presentes no fonte), mas impede a re-inspeção independente pelo monitor.
- Detalhe menor: o roadmap marca a Fase V4 ✅ com evidências em
  `/tmp/browser/v4-phase/` (linha 25), enquanto a instrução de handoff pedia
  evidências dentro do projeto — o builder **fez o certo** (copiou script +
  4 PNGs para `docs/planning/evidence/stage-V4/`); a linha do roadmap apenas
  está desatualizada quanto ao local canónico.

## Riscos para as próximas etapas

1. Prova de animação sem artefacto: sem o log de saída do script de gate
   salvo em ficheiro, a V4 repete a fragilidade da V3 (prova só-transcrita).
   V5+ deve salvar a saída (`tee output.log`) junto ao script.
2. Screenshots de gate devem enquadrar o objeto da fase: na V4, um close-up
   de inimigo em patrol/combat (não só a intro) teria fechado a prova visual.
   Vale como padrão para V5 (close-up ADS) e V6 (screenshot sem HUD).
3. Variação de uniforme ausente: 8 inimigos idênticos lado a lado podem
   parecer "clone army" em close-up — planejar os 2–3 tons na V7 (ou aceitar
   explicitamente).
4. Arma do inimigo ainda é primitiva composta: ao aproximar a câmera na V5/V6
   (killcam, inspeção), o fuzil do inimigo pode destoar dos soldados skinned —
   acompanhar com o viewmodel V5 ou registrar o corte.
5. Campos `private` lidos pelo script de debug (`current`/`dead`): refator
   futuro que renomear esses campos quebra o gate silenciosamente — preferir
   getters públicos ou snapshot de debug estável.

## Recomendações

1. Marcar a Fase V4 como concluída (já marcada ✅ em
   `.opencode/roadmap-proj.md:22-25`) e avançar para V5 — nenhum item
   bloqueante restante.
2. A partir da V5, salvar a saída do script de gate (`output.log`) em
   `docs/planning/evidence/stage-V{N}/` junto ao script e screenshots, e
   enquadrar screenshots no objeto da fase (V5: close-up ADS; V6: cena sem
   HUD "zona de guerra").
3. Atualizar a linha 25 do roadmap: trocar `/tmp/browser/v4-phase/` por
   `docs/planning/evidence/stage-V4/` (local canónico que sobrevive a wipes).
4. Registrar FPS em desktop real como pendência da V7 (NFR-01), conforme já
   anotado no status.
5. Na V5 (viewmodel), revalidar o muzzle do inimigo contra o novo padrão de
   efeitos (tracers/flash por material da V6) — smoke test de combate com as
   duas armas em cena.

## Evidências consultadas

- `docs/planning/stages/stage-V4-status.md` (57 linhas; gates 2026-10-06)
- `.opencode/prd-project1.md` (§5 RM-05, §8 Fase V4, §10 Gates)
- `.opencode/roadmap-proj.md` (Fase V4, linhas 22–25)
- `docs/planning/PRD.md` + `docs/planning/ROADMAP.md` (cópias históricas v1)
- `src/game/ai/EnemyVisual.ts` (498 linhas; mixer :243-264, shoot :308-344,
  mortes :347-409, mira :434-445, update :447-490)
- `src/game/ai/EnemyVisual.test.ts` (53 linhas, 4/4)
- `src/game/ai/Enemy.ts` (:55/:101-110 integração, :144 morte, :490 disparo,
  :582-603 update/dispose)
- `src/game/ai/Director.ts` (:49-51 hitboxes vivas)
- `src/game/weapons/WeaponSystem.ts` (:105 hitSources, :251-291 leitura enemyId)
- `scripts/assets/manifest.json` (entrada `soldier` P1), `report.json`
  (51,7 MB / 120; primeiro frame 3,02 MB / 40)
- `public/game-assets/characters/soldier.glb` (2,1 MB no disco),
  `public/game-assets/CREDITS.md:17` (MIT)
- `docs/planning/evidence/stage-V4/` (`check_anim5.py` + 4 PNGs inspecionados;
  `a0.png`/`a4_look.png`/`s0_after_click.png` mostram intro, não o inimigo)
- Gates re-executados pelo monitor: `bunx vitest run` 52/52,
  `bun run build` OK, `bunx eslint src scripts` 0 erros
- Não re-executado pelo monitor: Playwright + screenshots (prova repousa no
  registo do builder + verificação estrutural do código aqui; precedente dos
  evals V2/V3)

## Reconfirmação independente (2026-10-06, segundo turno do monitor)

**Contexto:** novo pedido de avaliação da Stage V4 chegou com o relatório
acima já existente e datado de hoje. O monitor revalidou tudo de forma
independente neste turno — o veredito **concluída** permanece, sem nenhuma
alteração no conteúdo acima.

**Verificação executada neste turno (só leitura, sem alterar código):**
- `EnemyVisual.ts` lido na íntegra (498 linhas): mixer Idle/Walk/Run
  (`:243-264`), shoot aditivo (`:308-344`), 2 mortes LoopOnce +
  clampWhenFinished (`:347-409`), mira Spine2/Neck pós-mixer (`:434-445`),
  6 hitboxes `userData { enemyId, zone }` (`:286-295`), arma na mão direita
  com muzzle real (`:275-282`), `frustumCulled = false` (`:235`), fallback
  P1 com `console.warn` (`:301-304`).
- `Enemy.ts`: integração intacta (`:101-106` hitboxes async + `onHitMeshes`,
  `:144` playDeath, `:490` playShoot, `:495` muzzle fallback,
  `:587-594` delegação do update, `:603` dispose).
- Contrato ponta a ponta reauditado: `Director.ts:49-51/:119-120`
  (repasses vivos) → `WeaponSystem.ts:105/:246/:251-291` (lê `enemyId`,
  compatível com `targetId` legado).
- `manifest.json`: entrada `soldier` P1 MIT; `soldier.glb` 2.160.468 bytes
  no disco; `CREDITS.md:17` MIT; `report.json` 51,7 MB / 120, primeiro
  frame 3,02 MB / 40.
- `check_anim5.py` lido: inspeção via `__obScene`/`__obDirector`
  (SkinnedMesh, hitboxes, 2 amostras de patrol, captura de console errors).
- Imagens reinspecionadas (`a0.png`, `a4_look.png`): intro com letterbox
  "OPERAÇÃO: BLACKOUT" — nenhum inimigo visível; ressalva de prova do
  relatório acima confirmada e mantida.
- Gates re-executados neste turno: `bunx vitest run` **52/52** (7 ficheiros),
  `bun run build` OK, `bunx eslint src scripts` **0 erros** (6 warnings
  pré-existentes em `src/components/ui/*`).
- Roadmap `.opencode/roadmap-proj.md:22-25` Fase V4 ✅; linha 25 ainda cita
  `/tmp/browser/v4-phase/` enquanto o canónico é
  `docs/planning/evidence/stage-V4/` — desatualização menor já registrada
  acima, sem impacto no veredito.

**Discrepâncias novas:** nenhuma. Status, roadmap, código e evidências
convergem. Fase V5 autorizada a iniciar.
