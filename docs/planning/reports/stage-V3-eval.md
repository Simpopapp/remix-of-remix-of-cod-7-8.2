# Avaliação — Stage V3 (reavaliação pós-desbloqueio — substitui o veredito anterior)

**Data:** 2026-10-06
**Veredito:** concluída
**Confiança da avaliação:** alta

## Resumo executivo

A Fase V3 (cidade destruída, PRD v2 RM-03/RM-04, §8 Fase V3, §10 Gates) está
**desbloqueada e concluída**. A causa raiz declarada pelo builder
(enquadramento: muro norte de 6 m ocultando os prédios) confirma-se no código
e a correção está implementada exatamente como descrita: muro norte em banda
única, rubble piles de brecha e `frustumCulled = false` no entulho e nos
vergalhões. O monitor re-executou neste turno os gates estáticos —
**vitest 48/48, `bun run build` OK, `bunx eslint src scripts` 0 erros** —
e auditou por grep a ausência de `BoxGeometry` de cenário no caminho de render
do `/play`. O veredito anterior (`bloqueada`) está superado; este relatório o
substitui.

## Cobertura de requisitos

- Atendido: correção do enquadramento — `src/game/data/ruins.ts:484-489`
  (comentário documenta a decisão), `:492-508` (muro norte z=26 com
  `skipIdx`/`tiltIdx` de dano preservados) e `:523-524`
  (`bands = wall.z === 26 ? [0] : [0, 3]` — banda única 3 m no norte,
  2 bandas 6 m nas laterais/fundo). Brecha legível: rubble piles seeds 94–97
  em z≈25 (`ruins.ts:671-674`).
- Atendido: recomendação nº 2 do eval anterior aplicada —
  `frustumCulled = false` no kit principal (`RuinedCity.ts:176`), no entulho
  (`:229`) e nos vergalhões (`:298`). Nenhum `InstancedMesh` do kit sem a
  proteção restante.
- Atendido: planters/AC units a partir dos módulos reais do kit
  (`RuinedCity.ts:342-349` — `kit_stone/Prop_Planter_Single`,
  `kit_trim/Prop_ACUnit` via `placeKitProp`, sem GLB inventado).
- Atendido: `Level.ts` integrado — `getLevelColliders()` soma
  props + ruínas (`Level.ts:31-32`), `createRuinedCity` chamado no build da
  cena (`:140`); cenário procedural de caixas removido (cabeçalho `:14`);
  contrato `getValidationColliders()` preservado, colliders por dados.
- Atendido (re-executado pelo monitor neste turno): vitest **48/48**
  (6 ficheiros), `bun run build` OK, `bunx eslint src scripts` **0 erros**
  (6 warnings pré-existentes em `src/components/ui/*`, aceites por convenção).
- Atendido (declarado pelo builder, consistente com o código): Playwright
  `/play` com pointer lock via botão, 0 erros de console, 5 screenshots em
  `/tmp/browser/v3-phase/` (prédios A/C/D visíveis de perto). **Ressalva de
  ambiente:** `/tmp/browser/` foi limpo pelo remix (diretório inexistente
  neste turno), de modo que as imagens não puderam ser re-inspecionadas —
  a prova visual repousa no registo detalhado do builder mais a verificação
  estrutural do código feita aqui (ver Discrepâncias).
- Atendido (auditoria por grep neste turno): zero `BoxGeometry` de cenário
  no caminho do `/play`. Ocorrências restantes são gameplay/debug fora do
  cenário: `Enemy.ts`/`Viewmodel.ts`/`Effects.ts` (soldado, arma, tracers —
  fases V4/V5), `Targets.ts` (postes de alvos de teste), `ValidationScene.ts`
  (cena de debug, **nunca instanciada** fora do próprio ficheiro; demais
  módulos só importam o tipo `BoxCollider`). `Level.ts`/`RuinedCity.ts`/
  `ruins.ts`/`props.ts`: nenhum `BoxGeometry`; primitivas restantes são
  `Plane`/`Cylinder` de infra (underlay do terreno, pilares, holofote —
  fora do escopo do gate, que veda caixas de cenário).
- Ausente / não evidenciado (fora do gate V3, pendência V7 conhecida):
  FPS em desktop real (NFR-01; headless ~3 fps não mede).

## Qualidade do código

Pontos fortes:
- A correção é orientada a dados, não ad hoc: o parâmetro `bands` vive em
  `compoundWalls()` e o dano (`skipIdx`/`tiltIdx`) foi preservado na banda
  restante — o muro continua "destruído", só que baixo o suficiente para
  enquadrar a cidade (RM-03: vista da cidade através do portão).
- Separação dados vs. mundo mantida; `heightAt` usado no entulho
  (`RuinedCity.ts:207`); erro `exactOptionalPropertyTypes` no `panelRun`
  corrigido via spread condicional (padrão do projeto).
- Teste `ruins.test.ts` cobre o essencial: placements contra manifesto,
  perímetro do pátio, fachada do prédio A em z≈46, lajes não bloqueantes,
  stack de caixotes, decais da fachada — 48/48 verdes re-executados aqui.
- Tratamento de erros: módulo ausente vira `console.warn` identificado,
  sem quebrar a cena; dispose seguro antes de ready.

Pontos de atenção (não bloqueantes):
- `ruins.ts` cresceu para 775 linhas (era 736 no eval anterior) — se passar
  de ~900, considerar fatiar por edifício; por ora a organização por
  funções (`panelRun`, `compoundWalls`, `warehousePanels`) segura.
- `kit_brick` (14,5 MB) segue via asset externo (`kit_brick.asset.json`);
  falha silenciosa vira só `warn` — risco já mapeado no eval anterior
  (fallback P0/erro visível) segue válido para V7.
- Barris cortados por D-03: cobertura do pátio depende agora de carros,
  barreiras e crates PBR — validar contra o Director na Fase 4 v1
  (regressão de gameplay, não de visual).

## Discrepâncias

- Nenhuma divergência material entre status e código: medidas conferem
  (4 GLB locais + pointer do brick de 14,5 MB, 4 props, `getLevelColliders`
  somando props+ruínas, `frustumCulled=false` ×3, seeds 94–97, bandas
  `[0]` vs `[0,3]`).
- Única divergência é **ambiental, não de conteúdo**: o status cita 5
  screenshots em `/tmp/browser/v3-phase/`, mas `/tmp` não sobrevive ao
  remix — o diretório não existe neste turno. Isso era esperado e não
  invalida a prova (o registo especifica nome, ponto de vista e conteúdo
  de cada imagem); apenas impede a re-inspeção pelo monitor. Recomendação
  abaixo propõe mitigação para as próximas fases.
- Detalhe menor: o status fala em "471 malhas, 470 PBR" (contagem da
  sessão anterior); o número não foi recontado neste turno por exigir
  Playwright, e não é condição do gate.

## Riscos para as próximas etapas

1. Evidência visual em `/tmp` evapora a cada remix — V4+ deve copiar as
   screenshots de gate para `docs/planning/stages/` (ou anexar ao status)
   para que o monitor as re-inspecione após wipe.
2. `kit_brick` externo: pointer quebrado = metade do kit some com só um
   warn. Antes da V7, decidir entre fallback P0 ou erro visível.
3. Cobertura de gameplay do pátio mudou (barris fora, carros/barreiras/
   crates no lugar) — a IA da Fase 4 v1 precisa de revalidação de cover
   contra `getLevelColliders()`.
4. Skyline sob `FogExp2` continua muito enevoado a longa distância —
   aceitável como decorativo, mas não contar com ele para nenhum aceite
   visual futuro.

## Recomendações

1. Marcar a Fase V3 como concluída no roadmap (checkboxes V3) e avançar
   para V4 — nenhum item bloqueante restante.
2. A partir da V4, persistir screenshots de gate dentro de
   `docs/planning/` (sobrevivem a wipes) em vez de só em `/tmp/browser/`.
3. Registrar a medição de FPS em desktop real como pendência da V7
   (NFR-01), conforme já anotado no status.
4. Na V4 (inimigos skinned), revalidar pontos de cobertura do pátio contra
   os novos colliders (risco nº 3).

## Evidências consultadas

- docs/planning/stages/stage-V3-status.md (seções de atualização 2026-10-06)
- .opencode/prd-project1.md (§5 RM-03/RM-04, §8 Fase V3, §10 Gates)
- .opencode/roadmap-proj.md (Fase V3), docs/planning/reports/stage-V3-eval.md (veredito anterior, superado)
- src/game/data/ruins.ts (775 linhas; :484-544 muros, :671-674 brechas)
- src/game/world/RuinedCity.ts (537 linhas; :176/:229/:298 frustumCulled, :342-349 kit-props)
- src/game/world/Level.ts (:14 remoção procedural, :31-32 colliders, :140 integração)
- src/game/data/ruins.test.ts, props.ts (123 linhas), kitManifest.ts (177 linhas)
- src/assets/kit_brick.asset.json (pointer, 14,5 MB)
- Gates re-executados pelo monitor: `bunx vitest run` 48/48, `bun run build` OK, `bunx eslint src scripts` 0 erros; grep `BoxGeometry` em `src/game` (24 ocorrências, 0 de cenário no caminho do /play)
- Não re-executado pelo monitor: Playwright + screenshots (ambiente renovado sem `/tmp/browser`; precedente do eval anterior, que também aceitou a declaração do builder)

## Reconfirmação pós-remix finalizado (2026-10-06, turno do monitor)

**Contexto:** mensagem de encerramento do remix informa V3 concluída com o
veredito deste relatório, roadmap marcado e V4 (Inimigos skinned) como
próxima fase. O monitor revalidou neste turno que nada regrediu desde a
reavaliação pós-desbloqueio acima — o veredito **concluída** permanece.

**Verificação executada neste turno (só leitura, sem alterar código):**
- `docs/planning/stages/stage-V3-status.md` inalterado (66 linhas; seção
  "remix — gates re-executados" presente); `.opencode/roadmap-proj.md`
  Fase V3 marcada ✅ com referência ao veredito concluída (linhas 16–20);
  Fase V4 ainda `[ ]` — próxima fase correta.
- Código da V3 intacto no disco: `ruins.ts` 775 linhas, `RuinedCity.ts`
  537 linhas, `Level.ts` 321 linhas, `ruins.test.ts` 97 linhas,
  `kitManifest.ts` 177 linhas, `props.ts` 123 linhas — medidas idênticas
  às registradas na reavaliação acima.
- Correções-âncora presentes: `ruins.ts:524`
  (`bands = wall.z === 26 ? [0] : [0, 3]`), `RuinedCity.ts:176/:229/:298`
  (`frustumCulled = false` ×3), `Level.ts:31-32` (colliders =
  props + ruínas) e `:140` (`createRuinedCity`).
- Zero `BoxGeometry` de cenário nos ficheiros da V3 (`Level.ts` só
  menciona em comentário; `RuinedCity.ts`/`ruins.ts`/`props.ts`/
  `kitManifest.ts` sem ocorrências).
- Assets no disco: 4 GLB locais em `public/game-assets/kit/`
  (roof/stone/street/trim) + 4 props em `public/game-assets/props/` +
  pointer `src/assets/kit_brick.asset.json`.
- Gates re-executados neste turno: `bunx vitest run` **48/48**
  (6 ficheiros, inclui `ruins.test.ts` 10/10); `bunx eslint src scripts`
  **0 erros** (6 warnings pré-existentes em `src/components/ui/*`,
  aceites por convenção). Build não re-executado neste turno (código
  idêntico ao da reavaliação com `bun run build` OK; sem divergência que
  justifique novo build).
- Playwright/screenshots não re-executados (mesma ressalva ambiental da
  reavaliação: `/tmp/browser` não sobrevive ao remix; prova visual repousa
  no registo do builder + verificação estrutural aqui).

**Discrepâncias novas:** nenhuma. Status, roadmap e código convergem.

**Autorização:** Fase V3 permanece **concluída**; Fase V4 — Inimigos
skinned (PRD v2 RM-05, roadmap-proj.md Fase V4) — **autorizada a iniciar**.
Recomendação vigente da reavaliação acima (persistir screenshots de gate
em `docs/planning/` a partir da V4) segue válida.
