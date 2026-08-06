-- ============================================================
-- Módulo Trabajo: Objetivos → Proyectos → Tareas (+ checklist) + Pomodoro.
-- Toda tabla privada: user_id, timestamps, RLS de dueño e índice por
-- (user_id, fecha) como el resto del proyecto.
-- ============================================================

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  emoji text,
  target_date date,
  status text not null default 'activo' check (status in ('activo','pausado','logrado','archivado')),
  display_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objective_id uuid references public.objectives(id) on delete set null,
  name text not null,
  emoji text,
  color text,
  status text not null default 'activo' check (status in ('activo','pausado','terminado','archivado')),
  display_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text,
  -- Tres estados: el kanban necesita saber qué está en curso.
  status text not null default 'pendiente' check (status in ('pendiente','haciendo','hecha')),
  priority text not null default 'media' check (priority in ('baja','media','alta')),
  due_date date,
  done_at timestamptz,
  estimate_min int,
  display_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Checklist dentro de una tarea.
create table if not exists public.task_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz default now()
);

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  log_date date not null default current_date,
  minutes int not null,
  kind text not null default 'foco' check (kind in ('foco','pausa')),
  created_at timestamptz default now()
);

create index if not exists objectives_user_idx on public.objectives (user_id, status);
create index if not exists projects_user_idx on public.projects (user_id, status);
create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
create index if not exists task_items_task_idx on public.task_items (task_id);
create index if not exists pomodoro_user_date_idx on public.pomodoro_sessions (user_id, log_date);

alter table public.objectives enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_items enable row level security;
alter table public.pomodoro_sessions enable row level security;

create policy "objectives owner" on public.objectives for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "projects owner" on public.projects for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tasks owner" on public.tasks for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "task_items owner" on public.task_items for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "pomodoro owner" on public.pomodoro_sessions for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
