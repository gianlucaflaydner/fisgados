-- Esquema da nuvem — SDD seções 3.3 e 3.4.
--
-- Aplicar num projeto Supabase novo:
--   supabase link --project-ref <ref> && supabase db push
-- ou colar no SQL Editor do painel.
--
-- Este arquivo é a única fonte do esquema remoto. O SQLite local tem esquema próprio, em
-- src/db/migrations/, e os dois **não** são iguais de propósito — ver a nota sobre a RN09.

-- ─────────────────────────────────────────────────────────────────────── perfis

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  -- Curto, legível e único: vira o link de convite (F10). Sem busca por nome ou telefone,
  -- entra quem recebeu o link de alguém de dentro.
  invite_code  text unique not null,
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────── capturas

create table if not exists catches (
  id            uuid primary key,       -- o mesmo id gerado no cliente: nasce definitivo
  user_id       uuid not null references profiles(id) on delete cascade,
  species_id    text,                   -- null = "não identificado" (RN12)
  length_cm     real not null,
  weight_g      real,
  weight_est_g  real,
  photo_path    text not null,          -- {user_id}/{catch_id}.jpg no bucket
  place_label   text,
  released      boolean not null default false,
  caught_at     timestamptz not null,   -- com hora e fuso: três insígnias dependem da hora
  created_at    timestamptz not null,
  updated_at    timestamptz not null,
  deleted_at    timestamptz             -- soft delete: o desbloqueio não volta atrás (RN01)
);

-- RN09 — a coordenada não existe aqui, e isso é a regra e não uma economia.
-- `lat` e `lng` ficam só no SQLite do aparelho. É a garantia técnica de que o ponto de pesca de
-- alguém não vaza nem por bug de permissão, nem por dump de banco, nem por engano de quem for
-- mexer nisto depois. Se um dia alguém precisar de estatística por região, derive no cliente e
-- suba o agregado — nunca o ponto.

-- ───────────────────────────────────────────────────────────────── desbloqueios

create table if not exists unlocks (
  user_id      uuid not null references profiles(id) on delete cascade,
  species_id   text not null,
  -- Sem FK para catches de propósito: pela RN01 o desbloqueio sobrevive à exclusão da captura
  -- que o originou. Uma FK com cascade fecharia carta, que é justamente o que a regra proíbe.
  first_catch_id uuid not null,
  unlocked_at  timestamptz not null,
  primary key (user_id, species_id)
);

-- ──────────────────────────────────────────────────────────────────── amizades

create table if not exists friendships (
  user_id    uuid not null references profiles(id) on delete cascade,
  friend_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  -- Amizade consigo mesmo passaria despercebida e sujaria todo ranking.
  constraint amizade_nao_reflexiva check (user_id <> friend_id)
);
-- A amizade é gravada nas duas direções na aceitação do convite. Gravar num sentido só faria a
-- política de leitura valer para um lado e não para o outro.

-- ──────────────────────────────────────────────────────────────────── índices

create index if not exists catches_user_caught_at on catches (user_id, caught_at desc);
create index if not exists catches_species_length on catches (species_id, length_cm desc);
create index if not exists friendships_friend on friendships (friend_id);

-- ─────────────────────────────────────────────────────────────────────── RLS

alter table profiles    enable row level security;
alter table catches     enable row level security;
alter table unlocks     enable row level security;
alter table friendships enable row level security;

-- Perfis: cada um manda no seu; amigos leem o do outro para montar o ranking.
create policy "perfil proprio" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "perfil de amigo" on profiles
  for select using (
    exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = profiles.id)
  );

-- Capturas: o dono escreve, o amigo só lê.
create policy "capturas do dono" on catches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "capturas de amigos" on catches
  for select using (
    exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = catches.user_id)
  );

create policy "desbloqueios do dono" on unlocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "desbloqueios de amigos" on unlocks
  for select using (
    exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = unlocks.user_id)
  );

create policy "amizades proprias" on friendships
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────── storage

insert into storage.buckets (id, name, public)
values ('catches', 'catches', false)
on conflict (id) do nothing;

-- O path é {user_id}/{catch_id}.jpg, então a primeira pasta é a dona do arquivo. A política
-- espelha a de `catches`: dono escreve, amigo lê. Leitura sempre por URL assinada de vida curta —
-- as fotos são do usuário e visíveis só para amigos vinculados (RN10).
create policy "fotos do dono" on storage.objects
  for all using (
    bucket_id = 'catches' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'catches' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "fotos de amigos" on storage.objects
  for select using (
    bucket_id = 'catches'
    and exists (
      select 1 from friendships f
      where f.user_id = auth.uid()
        and f.friend_id::text = (storage.foldername(name))[1]
    )
  );
