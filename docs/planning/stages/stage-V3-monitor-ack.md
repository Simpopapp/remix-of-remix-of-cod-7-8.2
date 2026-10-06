# Monitor ACK — Stage V3

**Data:** 2026-10-06
**De:** project-monitor (modo monitor, sem implementação)
**Para:** builder / orquestrador
**Assunto:** remix ativo recebido, Fase V3 autorizada a retomar com desbloqueio antes dos gates

## Recebimento confirmado

Recebi a notificação de remix ativo para PROJECT1 (OPERAÇÃO: BLACKOUT).
Protocolo Plan.md verificado em `.opencode/Plan.md`. Ambiente renovado pelo
remix registrado (OpenCode reinstalado fora do repo — sem impacto no
planejamento, que vive em `docs/planning/`).

## Verificação do protocolo (3 arquivos)

- `.opencode/project1.md` — existe (1 linha; intenção: FPS AAA realista cinematográfico comparável ao COD).
- `.opencode/prd-project1.md` — existe (379 linhas; PRD de melhoria com escopo por fase V1–V7 e critérios de aceite).
- `.opencode/roadmap-proj.md` — existe (42 linhas; fases em ordem de dependência com checkboxes e gates).
- Regra aplicável (Plan.md §O que fazer): "Os 3 existem: execute o roadmap, a partir da primeira fase não concluída."

Observação (não bloqueante): o PRD tem 379 linhas, abaixo do mínimo de 500
do Plan.md §Como criar — débito pré-existente de documentação, sem impacto
na execução da V3.

## Estado das fases

- Fases 1–6 (v1) concluídas; V1 concluída (`reports/stage-V1-eval.md`,
  veredito: concluída); V2 parcial (`reports/stage-V2-eval.md`, veredito:
  parcial — lint + Playwright pendentes à época).
- Primeira fase não concluída: **Fase V3 — Cidade destruída**
  (`roadmap-proj.md` Fase V3, PRD v2 §5 RM-03/RM-04 + §8 Fase V3).
- `docs/planning/stages/stage-V3-status.md` (2026-10-06) registra progresso
  real (integração Level.ts, 48/48 vitest, build OK, eslint 0 erros,
  Playwright 0 erros de console, 471 malhas / 470 PBR) + **BLOQUEIO
  explícito**: prédios destruídos não aparecem no enquadramento nos pontos
  testados (spawn e centro) — hipóteses: iluminação noturna dos materiais
  do kit, culling, posicionamento. Gate "screenshots da cidade" travado por
  esse bloqueio.
- Avaliação qualitativa registrada em `docs/planning/reports/stage-V3-eval.md`
  (veredito: **bloqueada**), com análise das 3 hipóteses no código.

## Autorização

Fase V3 — Cidade destruída — **autorizada a retomar, resolvendo o bloqueio
antes dos gates**: investigar enquadramento/iluminação/culling/posicionamento
(ver Recomendações do stage-V3-eval.md), e só então fechar os gates
(build + `bunx eslint src scripts` + vitest + Playwright /play 0 erros +
4 screenshots em `/tmp/browser/v3-phase/` + auditoria traverse zero
BoxGeometry de cenário). Este ACK não implementa código nem altera o roadmap.

Frase de controle: remix ativo, fase V3 autorizada com desbloqueio antes dos gates.
