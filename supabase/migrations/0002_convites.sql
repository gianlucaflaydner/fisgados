-- Aceitação de convite — F10.
--
-- Aplicar depois do 0001, no SQL Editor ou com `supabase db push`.
--
-- Por que uma função e não um insert direto: a amizade é gravada nas duas direções, e a política
-- de `friendships` só permite escrever linhas onde `user_id = auth.uid()`. Quem aceita consegue
-- criar `(eu, dono)` e não `(dono, eu)` — o vínculo ficaria de mão única, e o dono do convite
-- nunca veria as capturas de quem entrou.
--
-- Afrouxar a política resolveria e abriria um buraco: qualquer pessoa autenticada poderia se
-- inserir na lista de amigos de qualquer outra, sem convite nenhum. A função é o caminho estreito
-- — ela é o **único** lugar que escreve a linha inversa, e só faz isso depois de conferir que o
-- código existe.

create or replace function aceitar_convite(codigo text)
returns table (amigo_id uuid, amigo_nome text)
language plpgsql
-- `security definer` faz a função rodar com os poderes do dono, contornando o RLS. É o que
-- permite gravar a linha inversa — e é por isso que cada verificação abaixo importa.
security definer
-- Sem isto, alguém que conseguisse criar um schema no caminho de busca poderia sequestrar as
-- chamadas a `upper` ou `trim` dentro de uma função com poderes elevados.
set search_path = public, pg_temp
as $$
declare
  alvo uuid;
  nome text;
  limpo text;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado para aceitar um convite'
      using errcode = '28000';
  end if;

  -- O código é digitado por gente: maiúsculas, sem espaço nem hífen. A mesma normalização de
  -- `src/domain/convite.ts`, repetida aqui porque o servidor não pode confiar no cliente.
  limpo := upper(regexp_replace(coalesce(codigo, ''), '[\s-]', '', 'g'));

  select p.id, p.display_name into alvo, nome
  from profiles p
  where p.invite_code = limpo;

  if alvo is null then
    raise exception 'Convite não encontrado' using errcode = 'P0002';
  end if;

  if alvo = auth.uid() then
    raise exception 'Esse convite é seu' using errcode = 'P0001';
  end if;

  -- `on conflict do nothing` porque aceitar duas vezes é o caso normal: a pessoa toca no link,
  -- não vê resposta na tela e toca de novo. Isso não pode virar erro.
  insert into friendships (user_id, friend_id) values (auth.uid(), alvo)
    on conflict (user_id, friend_id) do nothing;
  insert into friendships (user_id, friend_id) values (alvo, auth.uid())
    on conflict (user_id, friend_id) do nothing;

  return query select alvo, nome;
end;
$$;

-- Só quem está logado executa. `public` inclui o papel anônimo, e uma função com poderes
-- elevados aberta ao anônimo seria o buraco que a função existe para evitar.
revoke all on function aceitar_convite(text) from public, anon;
grant execute on function aceitar_convite(text) to authenticated;

-- ────────────────────────────────────────────────────────── desfazer amizade

-- Sair de um grupo precisa apagar as duas direções, pelo mesmo motivo de simetria.
create or replace function remover_amizade(outro uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado' using errcode = '28000';
  end if;

  delete from friendships
  where (user_id = auth.uid() and friend_id = outro)
     or (user_id = outro and friend_id = auth.uid());
end;
$$;

revoke all on function remover_amizade(uuid) from public, anon;
grant execute on function remover_amizade(uuid) to authenticated;
