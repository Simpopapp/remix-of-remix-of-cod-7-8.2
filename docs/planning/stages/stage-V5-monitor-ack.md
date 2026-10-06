# Monitor ACK — Stage V5

**Data:** 2026-10-06
**De:** project-monitor (modo monitor, sem implementação)
**Para:** builder / orquestrador
**Assunto:** remix ativo recebido, Fase V5 autorizada

## Recebimento confirmado

Recebi a notificação de remix ativo para PROJECT1 (v2 Salto Visual AAA).
Protocolo Plan.md verificado em `.opencode/Plan.md`. Planejamento sobrevive
em `docs/planning/` + `.opencode/` (sobrevive a wipes de binários).

## Verificação do protocolo (3 arquivos)

- `.opencode/project1.md` — existe (1 linha; intenção: FPS AAA realista cinematográfico comparável ao COD).
- `.opencode/prd-project1.md` — existe (379 linhas; PRD de melhoria com escopo por fase V1–V7 e critérios de aceite).
- `.opencode/roadmap-proj.md` — existe (42 linhas; fases em ordem de dependência com checkboxes e gates).
- Regra aplicável (Plan.md §O que fazer): "Os 3 existem: execute o roadmap, a partir da primeira fase não concluída."

Observação (não bloqueante): o PRD tem 379 linhas, abaixo do mínimo de 500
do Plan.md §Como criar — débito pré-existente de documentação já registrado
no ACK da V3, sem impacto na execução da V5.

## Estado das fases

- Fases 1–6 (v1) concluídas; V1 concluída (`reports/stage-V1-eval.md`,
  veredito: concluída); V2 concluída no roadmap com gates complementares
  registrados (`reports/stage-V2-eval.md`); V3 concluída
  (`reports/stage-V3-eval.md`, veredito: concluída pós-desbloqueio
  2026-10-06); V4 concluída (`reports/stage-V4-eval.md`, veredito:
  concluída, reconfirmação independente 2026-10-06).
- Primeira fase não concluída: **Fase V5 — Armas e mãos FPS**
  (`roadmap-proj.md` Fase V5 linhas 27–30, PRD v2 §5 RM-06 + §8 Fase V5).
- Escopo V5: ViewmodelV2 glTF com braços, câmera de viewmodel, recarga/troca
  animadas, flash flipbook, cápsulas. Gates: build + lint
  (`bunx eslint src scripts`) + vitest + close-up ADS.
- `docs/planning/stages/stage-V5-status.md` ainda não existe — correto: a fase
  ainda não foi executada. Nenhum bloqueio prévio registrado para V5.
- Recomendações herdadas da V4 aplicáveis à V5: salvar saída do script de
  gate (`output.log`) em `docs/planning/evidence/stage-V5/` junto ao script
  e screenshots, e enquadrar screenshots no objeto da fase (close-up ADS).

## Autorização

Fase V5 — Armas e mãos FPS — **autorizada a iniciar**: implementar ViewmodelV2
(glTF + mãos, mesma interface do Viewmodel por D-07), câmera de viewmodel com
FOV próprio, recarga/troca animadas, muzzle flash flipbook + luz pontual,
cápsulas ejetadas, e fechar os gates (build OK + `bunx eslint src scripts`
0 erros + vitest verde + Playwright /play 0 erros com sequência close-up ADS
de recarga/troca). Este ACK não implementa código nem altera o roadmap.

Frase de controle: remix ativado, fase V5 autorizada.
