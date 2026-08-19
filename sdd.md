# Software Design Document (SDD)
## Fisgados — Álbum de capturas para pescadores do Sul

**Versão:** 1.2 · agosto/2026
**Referência:** PRD v1.2

> **v1.1** incorpora o sistema de insígnias (seção 14), corrige a fonte de dados do FishBase —
> a API REST do rOpenSci foi descontinuada (seção 5) — e registra o que a Etapa 0 entregou.
> **v1.2** acompanha o PRD 1.2: catálogo de 91 cartas, variedades e eixo de medida por carta.

---

## 1. Visão geral da arquitetura

Aplicativo mobile **offline-first**. O dispositivo é a fonte de verdade para as capturas do
próprio usuário; a nuvem serve para backup, para o grafo de amigos e para os rankings.

```
┌─────────────────────────────────────────────┐
│  APP (Expo / React Native / TypeScript)     │
│                                             │
│  UI  ──►  Estado (Zustand)                  │
│            │                                │
│            ▼                                │
│      SQLite local (Drizzle)  ◄── fonte de   │
│            │                     verdade    │
│            ▼                     local      │
│      Outbox de sincronização                │
│      Catálogo (JSON embarcado, read-only)   │
└───────────────┬─────────────────────────────┘
                │ HTTPS (quando houver rede)
                ▼
┌─────────────────────────────────────────────┐
│  SUPABASE                                   │
│  · Auth   · Postgres + RLS   · Storage      │
│  · Edge Function: /identify (proxy Gemini)  │
└───────────────┬─────────────────────────────┘
                │
                ▼
         Google Gemini API (Flash)
```

**Decisão central:** o catálogo de espécies é um **arquivo JSON embarcado no bundle**, não uma
tabela no servidor. O álbum precisa funcionar sem rede, o catálogo muda raramente, e cada
consulta evitada é latência e custo a menos. Atualização de catálogo acontece por atualização do
app (ou, na v2, por um JSON versionado baixado e cacheado).

---

## 2. Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Mobile | **Expo (SDK atual) + React Native + TypeScript** | Você já trabalha com RN; Expo resolve câmera, GPS, imagem e build sem tocar em Xcode/Gradle |
| Estilo | **NativeWind** | Tailwind que você já domina, sintaxe idêntica |
| Navegação | **Expo Router** | Roteamento por arquivo, igual ao Next.js App Router |
| Estado | **Zustand** | Leve; o estado pesado vive no SQLite |
| Banco local | **expo-sqlite + Drizzle ORM** | Drizzle dá tipagem forte e migrations; SQL de verdade no dispositivo |
| Backend | **Supabase** | Auth, Postgres, Storage e Edge Functions numa coisa só; free tier generoso |
| IA | **Gemini Flash via Edge Function** | Free tier com entrada multimodal; a chave nunca vai para o app |
| Imagens | **expo-image-manipulator** → Supabase Storage | Compressão local antes do upload |
| Card compartilhável | **react-native-view-shot** | Renderiza um componente RN como PNG |

### Por que Supabase e não Next.js + Prisma

Você conhece melhor a segunda opção, mas aqui a primeira ganha por três motivos concretos: o
grafo de amigos exige autenticação e regras de acesso por linha, que o RLS resolve
declarativamente; o Storage já vem com URLs assinadas para as fotos; e não há servidor para
manter. Se em algum momento você quiser um site do álbum, aí sim entra um Next.js que consome
o mesmo Postgres.

---

## 3. Modelo de dados

### 3.1 Catálogo (JSON embarcado — `src/catalog/species.json`)

**O contrato canônico é `src/catalog/types.ts`** — o que segue é o resumo, e em caso de
divergência o arquivo manda. Duplicar a interface aqui foi como ela começou a divergir.

| Campo | Observação |
|---|---|
| `id` | slug estável: `traira`, `dourado`. É chave estrangeira no SQLite e no Postgres |
| `albums` / `albumOrder` | uma espécie pode estar em mais de um álbum, com posição própria em cada |
| `commonName` / `aliases` | apelidos alimentam a busca do seletor manual (PRD 9.1) |
| `rarity` | mecânica de coleção, não status de conservação |
| `variety` | linhagem, quando a carta não é um táxon (carpa-espelho, koi, tilápia-vermelha) |
| `measure` | `comprimento` ou `largura` — arraia se mede pelo disco (RN04) |
| `min/avg/maxLengthCm` | no eixo de `measure`. `max` define troféu na RN19 |
| `lengthWeight` | `P(g) = a × C(cm)^b`, no eixo de `measure`, com procedência. `null` → não estima |
| `fact`, `habitat`, `silhouette` | ficha da espécie (F08) |
| `visuallySimilarTo` | ids que a IA confunde — alimenta a desambiguação da seção 6.3 |
| `badges` | os cinco nomes da linha de insígnia (PRD 11.6) |
| `taxonomy` | resultado da conferência contra o FishBase, para auditoria |

Quatro diferenças em relação ao rascunho da v1.0, todas descobertas ao gerar o catálogo:

- **`albumOrder` em vez de `order`.** Sete espécies aparecem em dois álbuns (traíra, tilápia,
  jundiá, carpa-húngara, bagre-africano, dourado, black bass), em posições diferentes. Um número
  só não dava conta. São 84 espécies distintas para 91 cartas.
- **`lengthWeight` carrega procedência**, não só `a` e `b`: localidade, tamanho da amostra,
  quantos estudos concorreram e como o coeficiente chegou ao eixo certo. Sem isso não há
  como auditar um peso estranho seis meses depois (seção 5.2).
- **`variety`** permite duas cartas com o mesmo nome científico. O build só aceita isso quando
  ambas se declaram variedade — nome repetido sem variedade é copiar-colar mal terminado.
- **`measure`** existe porque nem todo peixe se mede pelo comprimento. As arraias verdadeiras
  usam largura do disco, e o coeficiente de peso tem que estar no mesmo eixo, sem conversão
  possível: ou o estudo já está em WD, ou a carta fica sem estimativa.

O campo `visuallySimilarTo` não é decorativo: ele alimenta a regra de desambiguação da seção 6.
Preenchido e validado como simétrico pelo build — `piava ↔ grumatã`,
`pintado ↔ cachara ↔ pintachara ↔ surubim`, `traira ↔ trairao`, `robalo-peva ↔ robalo-flecha`,
`jundia ↔ mandi-amarelo`, `cara ↔ tilapia`.

### 3.2 Banco local (SQLite)

```sql
CREATE TABLE catches (
  id            TEXT PRIMARY KEY,        -- UUID v7 gerado no cliente
  species_id    TEXT,                    -- NULL = "não identificado"
  length_cm     REAL NOT NULL,
  weight_g      REAL,                    -- peso real informado
  weight_est_g  REAL,                    -- calculado no salvamento
  photo_local   TEXT NOT NULL,           -- caminho no FileSystem
  photo_remote  TEXT,                    -- path no Storage após upload
  lat           REAL,
  lng           REAL,
  place_label   TEXT,
  released      INTEGER DEFAULT 0,

  -- ISO 8601 COM hora e fuso, não só data. Três insígnias dependem da hora ("Madrugueiro",
  -- "Sol a Pino", "Tá Comendo!") e o recálculo retroativo da RN17 só funciona se o dado
  -- estiver aqui desde a primeira captura. Gravar só a data cega o histórico para sempre.
  caught_at     TEXT NOT NULL,

  -- A captura foi registrada sem rede? Alimenta a insígnia "Sem Sinal" e, como não é
  -- derivável depois, precisa nascer junto com o registro (PRD 11.14).
  offline_origin INTEGER NOT NULL DEFAULT 0,

  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT,                    -- soft delete

  ai_suggestion TEXT,                    -- JSON do retorno da IA
  ai_accepted   INTEGER,                 -- 1 se o usuário aceitou a 1ª sugestão
  sync_status   TEXT NOT NULL            -- 'pending' | 'syncing' | 'synced' | 'error'
);

CREATE TABLE unlocks (
  species_id      TEXT PRIMARY KEY,
  first_catch_id  TEXT NOT NULL,
  unlocked_at     TEXT NOT NULL
);

-- Insígnias conquistadas. Uma linha por grau, não por linha de insígnia: o histórico da linha
-- é justamente a sequência de graus com data (RN18). Só entra na Etapa 5.
CREATE TABLE badges (
  line_id      TEXT NOT NULL,            -- 'especie:traira', 'fisgadas', 'album:costa-sul'
  tier         TEXT NOT NULL,            -- 'bronze' | 'prata' | 'ouro' | 'platina' | 'diamante'
  awarded_at   TEXT NOT NULL,
  trigger_id   TEXT,                     -- captura que fechou o limiar; NULL se veio de recálculo
  PRIMARY KEY (line_id, tier)
);

-- Contadores incrementais, para não varrer catches a cada salvamento (requisito de 30 s).
-- São cache derivável: podem ser reconstruídos do zero a qualquer momento pela RN17.
CREATE TABLE badge_counters (
  line_id      TEXT PRIMARY KEY,
  value        INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT NOT NULL
);

CREATE TABLE sync_outbox (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity      TEXT NOT NULL,             -- 'catch'
  entity_id   TEXT NOT NULL,
  operation   TEXT NOT NULL,             -- 'create' | 'update' | 'delete'
  payload     TEXT NOT NULL,
  attempts    INTEGER DEFAULT 0,
  last_error  TEXT,
  created_at  TEXT NOT NULL
);
```

**UUID v7 gerado no cliente** é a decisão que faz o offline funcionar sem dor: o registro nasce
com o id definitivo, não precisa de reconciliação depois, e a ordenação por id já é cronológica.

### 3.3 Postgres (Supabase)

```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url  text,
  invite_code text unique not null,
  created_at  timestamptz default now()
);

create table catches (
  id            uuid primary key,          -- mesmo id do cliente
  user_id       uuid not null references profiles(id) on delete cascade,
  species_id    text,
  length_cm     real not null,
  weight_g      real,
  weight_est_g  real,
  photo_path    text not null,
  place_label   text,                      -- coordenada NÃO sobe (RN09)
  released      boolean default false,
  caught_at     timestamptz not null,
  created_at    timestamptz not null,
  updated_at    timestamptz not null,
  deleted_at    timestamptz
);

create table friendships (
  user_id    uuid references profiles(id) on delete cascade,
  friend_id  uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);
-- amizade é gravada nas duas direções na aceitação do convite

create index on catches (user_id, caught_at desc);
create index on catches (species_id, length_cm desc);
```

**Atenção à RN09:** `lat`/`lng` existem apenas no SQLite local. O Postgres recebe só o
`place_label`. Isso não é economia — é a garantia técnica de que o ponto de pesca de alguém
nunca vaza, nem por bug de permissão, nem por dump de banco.

### 3.4 Políticas RLS

```sql
alter table catches enable row level security;

create policy "dono lê e escreve" on catches
  for all using (user_id = auth.uid());

create policy "amigos leem" on catches
  for select using (
    exists (
      select 1 from friendships f
      where f.user_id = auth.uid() and f.friend_id = catches.user_id
    )
  );
```

Storage: bucket `catches` privado, com path `{user_id}/{catch_id}.jpg` e política espelhando a de
`catches`. Leitura sempre por URL assinada com expiração curta.

---

## 4. Sincronização

**Padrão outbox.** Toda escrita vai para o SQLite e enfileira uma entrada em `sync_outbox`.
Um worker processa a fila quando há rede (`expo-network` + listener de conectividade).

Ordem de cada item:
1. Upload da foto para o Storage (se ainda não subiu).
2. `upsert` da linha em `catches`.
3. Marca `sync_status = 'synced'` e remove da outbox.

**Retry:** backoff exponencial com jitter — 2s, 8s, 30s, 2min, 10min. Após 5 tentativas, marca
`error` e mostra um indicador discreto na tela de histórico, sem bloquear o uso.

**Conflito:** last-write-wins por `updated_at`. É suficiente porque cada captura tem um único
dono e o app roda em um dispositivo por conta no MVP.

**Nunca bloqueie a UI esperando sincronização.** A captura já está salva; o resto é detalhe de
infraestrutura que o usuário não precisa ver.

---

## 5. Estimativa de peso

```typescript
// P(gramas) = a × C(cm)^b   — convenção FishBase
export function estimateWeight(lengthCm: number, s: Species): number | null {
  if (!s.lengthWeight) return null;
  const { a, b } = s.lengthWeight;
  return a * Math.pow(lengthCm, b);
}
```

### 5.1 De onde vêm os coeficientes

**A API REST do rOpenSci (`fishbase.ropensci.org`) foi descontinuada** — o host responde 404 em
todas as rotas. O acesso atual, e o que o próprio pacote `rfishbase` passou a usar, são snapshots
em Parquet no Source Cooperative:

```
https://data.source.coop/cboettig/fishbase/fb/v19.04/parquet/{tabela}.parquet
```

`scripts/build-catalog.mts` baixa quatro tabelas, guarda em `scripts/.cache/` e roda offline daí
em diante. A versão do snapshot é fixada em código: catálogo reproduzível não pode mudar sozinho.

| Tabela | Para quê |
|---|---|
| `species` | conferência de nomenclatura, comprimento e peso máximos |
| `poplw` | as relações comprimento-peso (`a`, `b`) |
| `popll` | conversão de comprimento padrão/furcal para total |
| `synonyms` | detectar nome que virou sinônimo após revisão taxonômica |

### 5.2 As cinco armadilhas, e o que o build faz com cada uma

Nenhuma delas aparece como erro no app. Todas aparecem como **peso errado**, que é pior.

1. **Tipo de comprimento.** Só 61% dos estudos estão em comprimento total; o resto está em padrão
   (SL) ou furcal (FL). Usar um `a` de SL como se fosse TL erra o peso em 40% ou mais. O build usa
   o `a` publicado quando o estudo é TL, o campo `aTL` quando o FishBase já converteu, e senão
   reescala pelo `popll`. Sem nenhum dos três, o estudo é descartado.
2. **Intercepto na conversão.** A relação do `popll` é linear com intercepto (`TL = 3,47 + 1,23 ×
   SL` no cascudo), não uma escala pura. Como o peso é uma potência, precisamos de um fator
   multiplicativo — o build lineariza **no comprimento médio da espécie**, onde a estimativa vai
   ser usada. Ignorar o intercepto errava o cascudo em quase metade.
3. **Faixa do estudo.** Foi o erro mais caro. Uma regressão ajustada em robalos de 3 a 17 cm
   descreve juvenis muito bem e não diz nada sobre um exemplar de 50 cm. O build exige que a faixa
   do estudo alcance o tamanho médio da espécie; quando nenhum alcança, avisa que é extrapolação.
4. **Estudos que discordam.** Comparar `a` e `b` isolados não ajuda — são correlacionados, e um par
   estranho pode prever bem. O build compara o **peso previsto no tamanho médio**, descarta quem
   se afasta mais que o dobro da mediana, e só então desempata por procedência e amostra.
5. **A referência também erra.** O FishBase registra 55 g de peso máximo para uma corvina de
   60 cm, o que é impossível. Antes de usar esse número como régua de conferência, o build testa
   se ele é plausível para o comprimento correspondente.

Além disso: `EsQ = yes` marca a relação como duvidosa no próprio FishBase, e essas linhas saem
antes de tudo. Sempre exiba como **"≈ 2,4 kg (estimado)"** — o usuário precisa saber que é cálculo.

### 5.3 Quando não há dado

Espécie sem estudo utilizável fica com `lengthWeight: null` e simplesmente não estima peso. Duas
saídas antes de chegar nisso, ambas declaradas no JSON e visíveis na ficha:

- **`fishbaseName`** — a espécie existe no FishBase sob o nome antigo, porque uma revisão recente
  ainda não chegou ao snapshot. É o caso da miraguaia (*Pogonias courbina*, arquivada como
  *P. cromis*) e do lambari (*Astyanax lacustris*, como *A. altiparanae*).
- **`fishbaseWeightProxy`** — empréstimo do coeficiente de um congênere, para peixe de porte
  relevante: cachara ← pintado, trairão ← traíra, marimbá ← sargo, sororoca ← cavala. Estimativa
  emprestada é mais grosseira e a ficha diz isso. Para lambari, não estimar é melhor que estimar
  mal — o empréstimo é exceção, não política.

O empréstimo é a **última** tentativa. Se o FishBase publicar um estudo para a própria espécie, o
proxy sai de cena sozinho no build seguinte.

---

## 6. Pipeline de identificação

### 6.1 Fluxo

```
Foto (comprimida, ~800px)
   │
   ├──► Edge Function /identify
   │        · valida JWT do usuário
   │        · rate limit por usuário (30/dia)
   │        · monta prompt com a LISTA FECHADA de espécies do álbum ativo
   │        · chama Gemini Flash
   │        · valida o JSON de retorno contra o catálogo
   │
   └──► Retorna: [{ speciesId, confidence, reason }] (máx. 3)
```

### 6.2 A decisão técnica que mais importa

**Nunca peça ao modelo para identificar o peixe em aberto.** Peça para escolher dentro de uma
lista fechada — as espécies do álbum regional ativo, com nome popular e científico. Isso muda
tudo:

- elimina alucinação de espécie inexistente ou de outro continente;
- o retorno já vem com `id` que existe no seu catálogo, sem fuzzy matching;
- a acurácia sobe muito, porque o problema deixa de ser "qual dos 34 mil peixes do mundo" e
  passa a ser "qual destes 16".

O prompt deve exigir **JSON puro**, sem markdown e sem preâmbulo, e o parser deve validar o
schema e descartar qualquer `speciesId` que não exista no catálogo.

### 6.3 Desambiguação

Se as duas primeiras sugestões estiverem a menos de 15 pontos percentuais de distância **e**
constarem uma na lista `visuallySimilarTo` da outra, o app não apresenta um vencedor. Mostra as
duas lado a lado com o traço que as diferencia (ex.: *"Piava tem mancha escura no meio do corpo;
grumatã tem boca em forma de ventosa"*). Isso vira aprendizado para o usuário em vez de erro
silencioso no álbum.

### 6.4 Limites do free tier

Os modelos Flash do Gemini aceitam entrada multimodal e operam, no free tier, na faixa de ~15
requisições por minuto e 1.500 por dia. Um grupo de amigos não chega perto disso — 1.500
identificações por dia é mais do que o grupo inteiro fará em um ano.

Dois pontos a registrar: os modelos Pro saíram do free tier em abril de 2026, então a arquitetura
deve assumir apenas Flash/Flash-Lite; e os termos do free tier permitem que os prompts sejam
usados para treinamento — irrelevante para fotos de peixe, relevante se o produto um dia mudar de
natureza. A troca para o tier pago é uma variável de ambiente, não uma refatoração.

### 6.5 Degradação

| Situação | Comportamento |
|---|---|
| Sem rede | Seletor manual direto; sem tentativa nem mensagem de erro |
| API fora do ar / timeout > 6s | Seletor manual; registra `ai_suggestion = null` |
| Confiança máxima < 40% | Não exibe sugestão (RN03) |
| Limite diário atingido | Seletor manual, com aviso discreto uma única vez |

O seletor manual é o caminho garantido. A IA é aceleração, nunca dependência.

---

## 7. Estrutura de pastas

```
src/
├─ app/                        # Expo Router
│  ├─ (tabs)/
│  │  ├─ index.tsx             # Álbum (tela inicial)
│  │  ├─ historico.tsx
│  │  ├─ ranking.tsx
│  │  └─ perfil.tsx
│  ├─ captura/
│  │  ├─ camera.tsx
│  │  ├─ identificar.tsx
│  │  └─ detalhes.tsx
│  ├─ especie/[id].tsx
│  ├─ convite/[code].tsx
│  └─ _layout.tsx
├─ components/
│  ├─ album/                   # SpeciesCard, AlbumGrid, UnlockAnimation
│  ├─ capture/                 # LengthInput, SpeciesPicker, WeightDisplay
│  ├─ share/                   # CatchCard (fonte do PNG compartilhado)
│  └─ ui/
├─ db/
│  ├─ schema.ts                # Drizzle
│  ├─ migrations/
│  └─ queries/                 # catches.ts, unlocks.ts, stats.ts
├─ catalog/
│  ├─ species.json             # ✅ gerado — 84 espécies, 91 cartas
│  ├─ types.ts                 # ✅ Species, Album, BadgeLine, LengthWeight
│  └─ index.ts                 # carrega, indexa por id e por álbum, busca por alias
├─ services/
│  ├─ identify.ts
│  ├─ sync.ts
│  ├─ storage.ts
│  └─ supabase.ts
├─ domain/
│  ├─ weight.ts                # estimateWeight
│  ├─ ranking.ts               # RN06, RN07
│  ├─ unlock.ts                # RN01
│  └─ badges.ts                # limiares e avaliação (seção 14)
├─ stores/
└─ assets/
   ├─ silhouettes/             # 50 SVGs
   └─ fonts/

scripts/
├─ build-catalog.mts           # ✅ FishBase → species.json (roda offline)
├─ inspect-fishbase.mts        # ✅ auditar um coeficiente estranho depois
├─ catalog/
│  └─ species-source.mts       # ✅ curadoria: nomes, raridade, faixas, insígnias
├─ lib/
│  └─ fishbase.mts             # ✅ download e leitura dos parquets, com cache
└─ .cache/                     # parquets baixados (fora do versionamento)
```

**Ordem das cartas:** a posição na grade não fica em cada espécie, e sim em `ALBUM_LAYOUT` —
uma lista de ids por álbum, em `species-source.mts`. Com 91 cartas, reorganizar o álbum é mover
uma linha, e o build confere que a lista e o campo `albums` de cada espécie concordam nos dois
sentidos.

**Sobre a extensão `.mts`:** os scripts são ESM, porque o leitor de Parquet só publica ESM. O
`package.json` fica sem `"type": "module"` para não atrapalhar o Metro na Etapa 1, e o `.mts`
resolve os dois lados sem comprometer o app.

`domain/` é código puro, sem React e sem I/O — as regras de negócio do PRD moram ali e são as
únicas partes que valem teste unitário no MVP.

---

## 8. Ativos visuais

As 91 silhuetas são o maior item de esforço fora do código, e a decisão de usá-las (em vez de
fotos) resolve simultaneamente o direito autoral e a identidade visual.

- **Formato:** SVG de caminho único, viewBox padronizado, `fill: currentColor`. Assim a mesma
  silhueta serve como cinza travada e como colorida por raridade, sem duplicar arquivo.
- **Orientação:** todos os peixes virados para o mesmo lado, proporção real preservada entre
  espécies (um lambari precisa parecer pequeno ao lado de um dourado na mesma grade).
- **Origem:** desenhe a partir de fotos de referência, não vetorize automaticamente foto de
  terceiro. Traço próprio elimina qualquer discussão de licença.
- **Produção:** comece com os 16 do álbum de pesqueiros. Não bloqueie o desenvolvimento
  esperando os 50 — use um placeholder genérico de peixe e vá substituindo.

---

## 9. Segurança e privacidade

- Chave da Gemini **apenas** na Edge Function. Nada de chave em `.env` do app: tudo que vai no
  bundle é público, inclusive `EXPO_PUBLIC_*`.
- Fotos em bucket privado, servidas por URL assinada de curta duração.
- Coordenada de GPS nunca trafega para o servidor (RN09).
- RLS ativo em todas as tabelas, com a política padrão negando tudo.
- Exclusão de conta: `on delete cascade` no Postgres + limpeza do bucket + wipe do SQLite local.
- Rate limit na Edge Function por `auth.uid()`, protegendo a cota compartilhada da Gemini.

---

## 10. Variáveis de ambiente

```env
# App (públicas por natureza — nada sensível aqui)
EXPO_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Edge Function (secrets do Supabase, nunca no bundle)
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-flash"
IDENTIFY_DAILY_LIMIT="30"
```

---

## 11. Custos

| Item | MVP (até ~20 usuários) |
|---|---|
| Supabase | R$ 0 (free tier) |
| Gemini Flash | R$ 0 (free tier) |
| Expo EAS Build | R$ 0 no plano gratuito (fila mais lenta) |
| Conta de desenvolvedor Google Play | US$ 25, pagamento único |
| Conta Apple Developer | US$ 99/ano — **só se for publicar no iOS** |
| **Total realista para rodar no grupo** | **~R$ 140 uma vez**, se só Android |

Para uso entre amigos, dá para pular a Play Store e distribuir o APK direto por link, custo zero.
Recomendo o **canal interno de teste** da Play Store: instalação normal, atualização automática,
sem revisão pública e sem os US$ 25 de imediato.

---

## 12. Plano de execução

**Etapa 0 — Catálogo — ✅ código entregue, falta a validação de campo**
`scripts/build-catalog.mts` gera `src/catalog/species.json` com 84 espécies e 91 cartas, mais
`catalog-report.md` com a auditoria. Feito: nomenclatura conferida contra o FishBase, coeficientes
de peso normalizados para comprimento total, faixas cruzadas com o máximo mundial, nomes de
insígnia de 42 espécies. **Pendente e indelegável:** a validação com pescadores da região
(PRD 9.1, validação 2) e as 50 silhuetas. Reexecutar com `npm run catalog:build`.

**Etapa 1 — Registro local — ✅ entregue**
Expo SDK 57 + RN 0.86 + SQLite/Drizzle. Câmera com compressão, seletor manual com busca por
apelido, medida com validação da RN04, peso estimado, GPS silencioso, salvar com desbloqueio na
mesma transação. Sem nuvem, sem IA. `caught_at` com hora e fuso e `offline_origin` gravados desde
a primeira captura. 22 testes de domínio passando; bundle Android exporta limpo.

**Falta antes de seguir:** usar numa pescaria de verdade. É onde aparecem os problemas de atrito
que nenhum documento antecipa.
Ao fim desta etapa o app já vai numa pescaria de verdade — e é aí que você descobre os problemas
de atrito que nenhum documento antecipa.

**Etapa 2 — Álbum**
Grade, silhuetas, desbloqueio, ficha, progresso, raridade.

**Etapa 3 — Nuvem**
Supabase, auth, RLS, outbox, upload de fotos, convite por link, rankings.

**Etapa 4 — IA**
Edge Function, prompt de lista fechada, desambiguação, telemetria de acurácia.

**Etapa 5 — Card compartilhável e insígnias** (seção 14)

Se a Etapa 1 não render um app agradável de usar com o peixe na mão, pare e conserte antes de
seguir. Todas as etapas seguintes só amplificam o que existir ali.

---

## 13. Débitos técnicos aceitos no MVP

Registrados de propósito, para não virarem surpresa:

- **Um dispositivo por conta.** Trocar de celular exige re-sincronizar do servidor; não há merge
  de bancos locais.
- **Sem paginação nos rankings.** Com 20 amigos, `order by` direto resolve.
- **Catálogo atualiza só com update do app.** Aceitável enquanto o catálogo for estável.
- **Sem testes de integração.** Só `domain/` tem teste unitário.
- **Sem i18n.** Strings em português direto no código.

---

## 14. Motor de insígnias

Implementa o PRD seção 11. Entra na Etapa 5, mas **dois campos precisam existir desde a Etapa 1**
(seção 3.2): `caught_at` com hora e fuso, e `offline_origin`.

### 14.1 A propriedade que governa o desenho

Toda insígnia é **derivável do histórico de capturas** (RN17). Isso não é detalhe de
implementação — é o que permite adiar o motor sem custo, e o que obriga o desenho:

- o motor é uma **função pura** `catches[] → badges[]`, sem estado próprio;
- `badge_counters` é **cache**, não fonte de verdade, e pode ser reconstruído a qualquer momento;
- lançar uma linha nova é rodar o recálculo, não migrar dados;
- um bug no motor se conserta corrigindo a função e recalculando, sem perder nada.

A única exceção é "Pioneiro" (primeiro do grupo a desbloquear uma espécie), que depende de ordem
entre usuários e só o servidor pode conceder.

### 14.2 Onde a avaliação acontece

No salvamento da captura, no dispositivo, offline. O caminho de 30 segundos não comporta varrer a
tabela `catches` inteira, então:

1. a captura entra em `catches`;
2. os contadores das linhas afetadas — volume, espécie, álbum, troféu, constância — são
   incrementados em `badge_counters`;
3. cada contador tocado é comparado com o limiar do próximo grau;
4. se cruzou, grava em `badges` e enfileira a animação, que roda **depois** da animação de
   desbloqueio de espécie, se houver.

O recálculo completo (RN17) roda em migração e em correção de bug, nunca no caminho quente.

### 14.3 Identificação das linhas

`line_id` é uma string com prefixo, para que uma linha nova não exija mudança de schema:

```
fisgadas                      família A
especie:traira                família B — id da espécie, nunca da carta (RN15)
colecao                       família C — linha geral
album:costa-sul               família C — por álbum
trofeu · metro                família D
pescarias · sequencia         família E
historia:cinco-em-um-dia      família F
```

`especie:traira` usa o id da carta, e não o do táxon: traíra aparece em dois álbuns e tem um
contador só, enquanto carpa-espelho e carpa-colorida têm contadores próprios apesar de serem
*Cyprinus carpio* como a húngara (RN15). O catálogo já entrega isso resolvido — 84 ids para
91 cartas.

### 14.4 O que o catálogo já fornece

`species.json` traz, por espécie, os cinco nomes da linha (`badges`) e a faixa de tamanho
(`maxLengthCm`), que é o que define troféu na RN19 — comprimento ≥ 80% do máximo. Espécie
lendária vem com `bronze` e `prata` nulos, conforme a regra do PRD 11.6, e espécie ainda sem
redação vem com `curated: false` e os nomes da regra de fallback. Nada disso precisa ser
recalculado no app: é leitura direta.

### 14.5 Limiares

Vivem em `domain/badges.ts`, não no catálogo — são regra, não dado sobre a espécie. Os da família
B dependem da raridade (PRD 11.6), que o catálogo fornece.

Ajuste de limiar é operação delicada: pode **subir** para insígnias ainda não concedidas, nunca
para as já conquistadas (RN13). Na prática, ao subir um limiar o recálculo precisa preservar as
linhas já gravadas em `badges` em vez de recriá-las do zero — é a única parte do motor onde o
recálculo não é idempotente, e a única que merece teste dedicado.
