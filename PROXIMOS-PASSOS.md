# Onde paramos e o que vem a seguir

Atualizado em 19/09/2026.

## Retomar em outro PC

1. `git clone https://github.com/gianlucaflaydner/fisgados.git` e `npm install`.
2. **Recrie o `.env`.** Ele não vai para o git, então não vem com o clone. Copie `.env.example`
   para `.env` e preencha:
   - `EXPO_PUBLIC_SUPABASE_URL`: painel do Supabase → *Project Settings → Data API*.
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: a **publishable key** (`sb_publishable_...`), em
     *Project Settings → API Keys*. Nunca a secret (`sb_secret_...`).
   - Não coloque a senha do banco (`PROJECT_PASSWORD`) no `.env`.
3. `npm run nuvem:check` confirma que o projeto responde e que as tabelas existem. Se o erro for
   de DNS ou "projeto pausado", o Supabase free pausou por inatividade: entre no painel e clique
   em *Restore project*.
4. `npx expo start -c` e escaneie o QR code com o **Expo Go** (o projeto usa o SDK 57, então
   atualize o Expo Go se ele reclamar da versão).
5. `npm test` (testes de domínio) e `npm run typecheck` devem passar sem erro.

## Fases

| Fase | O quê | Estado |
|---|---|---|
| 0 | Catálogo: 84 espécies, 91 cartas, fotos licenciadas | ✅ Código entregue. Falta a validação com pescadores |
| 1 | Registro local: foto (câmera ou galeria) com enquadramento, espécie, medida, peso estimado | ✅ Entregue |
| 2 | Álbum: grade, cartas acinzentadas quando bloqueadas, ficha da espécie, animação de desbloqueio, temas claro e escuro | ✅ Entregue |
| 3 | Nuvem e amigos: login no Supabase, sincronização com fila offline, amigos por código, ranking | ✅ No ar. Migration 0002 aplicada e teste de convites passando (16/16). Falta testar no celular com duas contas |
| 4 | IA: identificar a espécie pela foto, com o seletor manual como alternativa | ✅ No ar. Função publicada com `gemini-3.5-flash-lite`, traíra e dourado acertados em ~2 s. Falta testar no celular |
| 5 | Card compartilhável e insígnias | ⬜ Não começada |

### Fase 3, em detalhe

- ✅ Login e cadastro. A sessão fica salva no aparelho (uma conta por celular).
- ✅ Sincronização: toda captura entra numa fila e sobe quando houver sinal. Testada contra o
  projeto real.
- ✅ Telas de Amigos (código de convite de 6 letras) e de Ranking (coleção, espécies, no mês,
  maior exemplar).
- ✅ Migration `0002_convites.sql` aplicada e `npm run nuvem:convites` passando (16/16) em 19/09/2026.
- ⏳ Testar no celular com duas contas.

### Fase 4, em detalhe

- ✅ Edge Function `supabase/functions/identificar` publicada: confere o login, conta a cota
  diária (30 por pessoa), manda a foto para a Gemini com a **lista fechada** das 84 espécies e
  valida a resposta. Modelo `gemini-3.5-flash-lite`: o Flash normal passou de 25 s e deu 503 de
  sobrecarga no free tier.
- ✅ `npm run ia:check` passando: traíra e dourado em 1º lugar, com 85–95%, em ~2 s.
- ✅ No app: a identificação começa quando o enquadramento termina e corre enquanto a pessoa
  preenche o formulário. Até 3 sugestões embaixo do campo de espécie, com porcentagem; abaixo de
  40% não aparece nada; duas espécies parecidas quase empatadas aparecem lado a lado.
- ✅ Sem rede ou com falha, some sem mensagem de erro. O seletor manual continua igual.
- ✅ Telemetria: cada captura guarda o que foi sugerido e se a pessoa ficou com a primeira sugestão.
- ⏳ Testar no celular com fotos de verdade (as do teste são fotos boas do catálogo).
- ⬜ Não feito: sugerir depois uma captura registrada sem sinal (PRD 6.1). Hoje, sem rede, só o
  seletor manual.

## Próximo passo

1. **Testar no celular.** Rode `npx expo start -c` e:
   - registre uma captura e veja as sugestões aparecerem embaixo de "Espécie";
   - com uma segunda conta (outro celular), passe o código de convite em Amigos e confira o Ranking.
2. **Limpeza:** apague em *Authentication → Users* os usuários de teste `@fisgados.app`
   (`ana-`, `bia-`, `caio-`, `ia-`, `ia-local-`...).
3. Se o celular estiver certo, as Fases 3 e 4 fecham. Depois vem a Fase 5 (card compartilhável
   e insígnias).

Referência, caso precise publicar a função de novo (depois de mudar o catálogo, por exemplo):

```bash
npx supabase login
npm run ia:catalogo
npx supabase functions deploy identificar --no-verify-jwt --use-api --project-ref <ref>
npm run ia:check
```

O `<ref>` é o `xxxx` de `https://xxxx.supabase.co`. A chave da Gemini está em *Edge Functions →
Secrets* no painel e **não** vai no `.env`.

## Pendências que dependem de você

- **Trocar a senha do banco.** Ela apareceu numa conversa anterior. Troque em *Project Settings →
  Database → Reset database password* e guarde num gerenciador de senhas, fora do `.env`.
- **Pausa do Supabase free.** O projeto pausa depois de uns dias sem uso, e o app mostra "não foi
  possível falar com o servidor". Há três saídas: plano Pro, um "keep-alive" agendado ou
  restaurar à mão quando acontecer. A escolha ainda está em aberto.
- **Arte das cartas.** São 84 ilustrações, e as fotos atuais servem de referência.
- **Fotos com ressalva.** Carpa-espelho, tilápia-vermelha, cascudo-viola e surubim-do-Uruguai
  estão sem foto. A savelha usa uma ilustração, e os híbridos precisam ser revistos.
- **Validação do catálogo em campo.** Mostre a tabela do `catalog-report.md` para 2 ou 3
  pescadores e pergunte: "falta algum peixe óbvio?" e "esse nome é o que vocês falam?".
- **Usar numa pescaria de verdade** quando o app estiver pronto.

## Dívidas técnicas conhecidas

- `app/captura/detalhes.tsx` e `app/captura/[id].tsx` têm o mesmo formulário duplicado. Vale
  extrair um componente antes de acrescentar qualquer campo novo.
- O fuso horário original da captura não é salvo. O ranking "no mês" usa o fuso do aparelho de
  quem olha. Vale gravar o fuso junto quando chegar a Fase 5.

## Onde está cada coisa

- `prd.md`: produto (regras, insígnias, roadmap na seção 14).
- `sdd.md`: arquitetura e plano de execução (seção 12).
- `README.md`: como rodar, comandos e como ligar a nuvem.
- `supabase/migrations/`: SQL do servidor (0001, 0002 e 0003 aplicadas).
- `supabase/functions/identificar/`: a Edge Function da IA (`catalogo.ts` é gerado).
