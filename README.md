# Fisgados

Álbum de capturas para pescadores do Sul. Veja [prd.md](prd.md) para o produto e
[sdd.md](sdd.md) para a arquitetura.

**Estado:** Etapa 0 (catálogo) e Etapa 1 (registro local) entregues.
91 cartas, 84 espécies, 79 com estimativa de peso.

## Rodar no celular

```bash
npm install
npm start          # abre o Metro; escaneie o QR com o Expo Go
```

Não precisa de Android Studio nem Xcode. Câmera, GPS e SQLite funcionam no Expo Go.

## Outros comandos

```bash
npm test                   # testes da camada de domínio (22 casos)
npm run typecheck
npm run catalog:build      # regera src/catalog/species.json + catalog-report.md
npm run catalog:inspect    # colunas das tabelas do FishBase
npm run catalog:inspect -- Salminus brasiliensis   # + estudos daquela espécie
npm run db:generate        # nova migration após mexer em src/db/schema.ts
```

O primeiro `catalog:build` baixa ~28 MB de Parquet do FishBase para `scripts/.cache/`. Depois
disso roda offline. O build sai com código 1 se encontrar erro no catálogo.

## Onde mexer

| Quero... | Arquivo |
|---|---|
| Corrigir nome, apelido, raridade, faixa de tamanho | `scripts/catalog/species-source.mts` |
| Escrever nomes de insígnia que faltam | idem, campo `badges` |
| Adicionar ou remover uma espécie | idem — e a lista `ALBUM_LAYOUT`, no fim do arquivo |
| Reordenar as cartas de um álbum | só `ALBUM_LAYOUT` |
| Mudar como o coeficiente de peso é escolhido | `scripts/build-catalog.mts` |
| Ver o contrato do catálogo | `src/catalog/types.ts` |
| Mudar uma regra de negócio | `src/domain/` — código puro, com teste |
| Mexer no banco | `src/db/schema.ts`, depois `npm run db:generate` |

`src/catalog/species.json` e `catalog-report.md` são **gerados**. Não edite à mão.

## Estrutura

```
app/                  telas (Expo Router)
  index.tsx           home: contador do álbum + histórico + botão de registrar
  captura/            câmera → detalhes → seletor de espécie
src/
  catalog/            species.json gerado, tipos e o índice de busca
  domain/             regras do PRD, sem React e sem I/O
  db/                 schema Drizzle, migrations e queries
  stores/             rascunho da captura em andamento
scripts/              geração e auditoria do catálogo, testes
```

## Próximos passos

1. **Usar numa pescaria de verdade.** É o teste que o SDD manda fazer antes de seguir: se
   registrar com o peixe na mão não for agradável, pare e conserte. Nenhuma etapa seguinte
   melhora isso.
2. **Validação de campo do catálogo** — levar a tabela da seção 4 do `catalog-report.md` para
   dois ou três pescadores e um dono de pesqueiro. É a validação 2 do PRD 9.2, e ninguém faz por
   você. As perguntas que resolvem quase tudo: *"falta algum peixe óbvio aqui?"* e *"esse nome é
   o que vocês falam?"*
3. **Silhuetas** — 91 no total; comece pelas 23 do álbum de pesqueiros (SDD seção 8).
4. **Nomes de insígnia** das 42 cartas em fallback (seção 5 do relatório).
5. **Etapa 2** — o álbum: grade, desbloqueio, ficha da espécie, progresso.
