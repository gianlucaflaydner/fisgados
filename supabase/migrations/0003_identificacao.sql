-- Identificação por IA — Fase 4 (SDD seção 6).
--
-- Aplicar depois do 0002, no SQL Editor ou com `supabase db push`.
--
-- Duas coisas: a cota diária de identificações por pessoa, que protege a cota da Gemini dividida
-- pelo grupo inteiro, e as colunas que guardam o que a IA sugeriu em cada captura, para medir a
-- acurácia sem nunca misturar sugestão com escolha (RN02).

-- ──────────────────────────────────────────────────────────────── cota diária

create table if not exists identificacoes_uso (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia     date not null,
  total   integer not null default 0,
  primary key (user_id, dia)
);

-- RLS ligado e nenhuma política: ninguém lê nem escreve a tabela direto. O único caminho é a
-- função abaixo. Uma política de escrita deixaria qualquer um zerar o próprio contador.
alter table identificacoes_uso enable row level security;
revoke all on table identificacoes_uso from anon, authenticated;

-- Conta mais uma identificação para quem chama e devolve o total do dia.
--
-- Quem decide se passou do limite é a Edge Function, que lê o limite de um secret: assim trocar
-- 30 por 50 não exige migration. Chamar esta função por fora, direto na API, só faz o contador
-- da própria pessoa subir — não dá identificação nenhuma de graça.
--
-- O dia é o de Brasília, não o UTC: quem pesca de madrugada não pode ver a cota "virar" às 21h.
create or replace function registrar_identificacao()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quem uuid := auth.uid();
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  n integer;
begin
  if quem is null then
    raise exception 'É preciso estar logado para identificar' using errcode = '28000';
  end if;

  insert into identificacoes_uso (user_id, dia, total)
  values (quem, hoje, 1)
  on conflict (user_id, dia) do update set total = identificacoes_uso.total + 1
  returning total into n;

  return n;
end;
$$;

revoke all on function registrar_identificacao() from public, anon;
grant execute on function registrar_identificacao() to authenticated;

-- ────────────────────────────────────────────────── telemetria de acurácia

-- O que a IA sugeriu, guardado ao lado do que a pessoa escolheu. `ai_accepted` diz se a
-- escolha foi a primeira sugestão. Nunca sobrescrevem `species_id` (RN02).
alter table catches add column if not exists ai_suggestion jsonb;
alter table catches add column if not exists ai_accepted boolean;
