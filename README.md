# Fisgados

Álbum de capturas para pescadores do Sul. Veja [prd.md](prd.md) para o produto e
[sdd.md](sdd.md) para a arquitetura.

**Estado:** Etapas 0 (catálogo), 1 (registro local) e 2 (álbum) entregues.
91 cartas, 84 espécies, 79 com estimativa de peso.
Conta local com login (F14), foto da câmera ou da galeria com enquadramento em 3:4, captura
desenhada como carta, e dois temas — **Papel** de dia, **Água Funda** de madrugada.

## Rodar no celular

```bash
npm install
npm start          # abre o Metro; escaneie o QR com o Expo Go
```

Não precisa de Android Studio nem Xcode. Câmera, galeria, GPS e SQLite funcionam no Expo Go.

Na primeira abertura o app pede para criar uma conta. Ela existe **só neste aparelho**: não há
servidor até a Etapa 3, não há e-mail de confirmação e não há recuperação de senha. Serve para
separar o histórico de duas pessoas no mesmo celular e para cada captura já nascer com dono.

**A sessão não expira.** Quem entra continua entrado até tocar em "Sair" — inclusive depois de
fechar o app ou de o sistema matá-lo. Se a leitura da sessão falhar no boot, o app tenta de novo e
mostra um aviso; nunca cai no login, porque erro de banco não é motivo para deslogar ninguém.

O tema segue o sistema por padrão e se troca no botão **Tema**, no topo da home. A escolha é do
aparelho, não da conta.

O álbum abre pelo contador de espécies na home. Carta trancada mostra a mesma foto em escala de
cinza — um asset por espécie, e o desbloqueio é literalmente a cor voltando ao desenho. O cinza
sai do `filter` nativo do React Native, sem arquivo extra nem dependência.

A cena de desbloqueio é a única com animação no app, e respeita a preferência de redução de
movimento do sistema. Ela aparece nas duas telas que podem abrir carta: ao registrar e ao
corrigir a espécie de uma captura já salva.

Tocar num card do histórico abre a correção, onde dá para ajustar espécie, medida, peso, local e
"pescado e solto", ou excluir. Excluir é *soft delete* e **não** fecha carta: pela RN01 o
desbloqueio nunca volta atrás.

Toda foto passa por um passo de enquadramento em **3:4**, que é a proporção da carta do álbum:
pinça para o zoom, arrasto para a posição, e um botão para girar. A foto original continua
intacta na galeria — o app guarda só o pedaço escolhido.

## Outros comandos

```bash
npm test                   # testes da camada de domínio (40 casos)
npm run typecheck
npm run catalog:build      # regera src/catalog/species.json + catalog-report.md
npm run photos:fetch       # procura fotos por licença (só monta o manifesto)
npm run photos:fetch -- --baixar     # e baixa a primeira candidata de cada espécie
npm run photos:prepare     # reduz, gera src/catalog/fotos.ts e creditos.ts
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
| Mexer no login, no cadastro ou na sessão | `src/auth/` (banco e hash), `src/domain/conta.ts` (regras) |
| Mudar como a foto entra ou é comprimida | `src/media/photo.ts` |
| Mexer no enquadramento da foto | `src/domain/recorte.ts` (geometria) e `app/captura/enquadrar.tsx` (gestos) |
| Mudar o desenho da carta de captura | `src/components/CartaCaptura.tsx` |
| Mudar o desenho da carta do álbum | `src/components/CartaAlbum.tsx` |
| Mexer na cena de desbloqueio | `src/components/Desbloqueio.tsx` |
| Reordenar as cartas de um álbum | `ALBUM_LAYOUT` em `scripts/catalog/species-source.mts` |
| Trocar a foto de uma espécie | apague o arquivo em `assets/especies/` e rode `photos:fetch -- --baixar` |
| Mexer em qualquer cor | `src/theme/cores.ts` **e** `src/global.css` — os dois, sempre |
| Mexer no banco | `src/db/schema.ts`, depois `npm run db:generate` |

`src/catalog/species.json`, `catalog-report.md`, `src/catalog/fotos.ts` e
`src/catalog/creditos.ts` são **gerados**. Não edite à mão.

## Fotos das espécies

83 das 84 espécies têm foto embarcada (5,6 MB), vindas do iNaturalist e do Wikimedia Commons.
Só entram fotos sob **CC0, domínio público ou CC BY** — o padrão do iNaturalist é CC BY-NC, que
proíbe uso comercial e por isso é recusado, e CC BY-SA também é recusado porque o recorte 3:4 da
carta é uma adaptação e o share-alike se propagaria para o app.

**CC BY exige crédito visível.** A tela `app/creditos.tsx` cumpre isso e é alimentada por
`src/catalog/creditos.ts`, gerado junto com as imagens. Se as fotos forem usadas, a tela precisa
continuar alcançável.

Falta revisar espécie por espécie: "research grade" no iNaturalist significa que a comunidade
concordou com a identificação, não que a foto sirva para o app. A do **Tambacu** já é sabidamente
suspeita — veio de busca textual no Wikimedia e casou com uma prancha de livro.

A paleta vive em dois lugares: `src/theme/cores.ts` (para `ActivityIndicator`,
`placeholderTextColor`, `Switch` e o cabeçalho, que recebem cor por propriedade) e
`src/global.css` (para as classes do Tailwind). Mexeu num, mexa no outro — `npm test` compara os
dois e falha se divergirem, e também confere o contraste mínimo de cada par de cores nos dois
temas.

## Estrutura

```
app/                  telas (Expo Router)
  _layout.tsx         migrations, sessão e o guard que decide login vs. app
  (auth)/             entrar e criar conta — única árvore visível sem sessão
  index.tsx           home: contador do álbum + histórico + botão de registrar
  album/              grade das cartas por álbum regional e ficha da espécie
  captura/            câmera/galeria → enquadrar → detalhes → seletor de espécie
  creditos.tsx        atribuição das fotos, exigida pela licença CC BY
src/
  catalog/            species.json gerado, tipos e o índice de busca
  domain/             regras do PRD, sem React e sem I/O
  db/                 schema Drizzle, migrations e queries
  auth/               contas locais, hash de senha e sessão
  theme/              a paleta dos dois temas, para o que não aceita classe
  media/              entrada e compressão da foto
  components/         pedaços de tela reaproveitados
  stores/             rascunho da captura, sessão ativa e tema
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
3. **Revisar as 83 fotos** — uma passada de olho para achar espécie errada ou foto ruim.
4. **Arte das cartas** — 84 ilustrações (não 91: sete espécies aparecem em dois álbuns e
   reaproveitam a arte). As fotos servem de referência.
5. **Nomes de insígnia** das 42 cartas em fallback (seção 5 do relatório).
6. **Extrair o formulário compartilhado** entre `captura/detalhes` e `captura/[id]` — hoje são
   dois formulários iguais e independentes, que vão divergir no primeiro campo novo.
7. **Etapa 3** — nuvem e amigos: autenticação no Supabase, sincronização, convite por link.
