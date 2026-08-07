-- Conexión con Strava. Los tokens son secretos: solo los toca el servidor,
-- y la política deja al dueño verlos para saber si está conectado y poder
-- desconectarse, nunca a otro usuario.
create table if not exists public.strava_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_id bigint not null unique,
  access_token text not null,
  refresh_token text not null,
  -- Strava vence el access token cada ~6 h: se refresca con el refresh_token.
  expires_at timestamptz not null,
  scope text,
  athlete_name text,
  connected_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.strava_connections enable row level security;

create policy "strava owner" on public.strava_connections for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- De dónde salió la sesión y su id en el origen: sin esto, un webhook
-- reenviado por Strava duplicaría la misma caminata.
alter table public.workouts
  add column if not exists source text not null default 'manual',
  add column if not exists external_id text;

create unique index if not exists workouts_user_external_idx
  on public.workouts (user_id, external_id) where external_id is not null;
