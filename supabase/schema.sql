-- GymBro Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
--
-- Security model (same as the old firestore.rules):
-- The LIFF client NEVER talks to Supabase directly. All reads/writes go
-- through the Vercel API, which uses the Supabase *service_role* key
-- (server-side only) and manually scopes every query by req.userId
-- (verified from the LINE ID token). Because of that, RLS is enabled with
-- NO policies, i.e. the anon/authenticated keys can't read or write
-- anything — only the service_role key (which bypasses RLS) can.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- users  (LINE userId is the primary key, e.g. "U4af4980629...")
-- ---------------------------------------------------------------------
create table if not exists users (
  id text primary key,
  display_name text,
  picture_url text,
  updated_at timestamptz not null default now()
);

alter table users enable row level security;

-- ---------------------------------------------------------------------
-- todos
-- ---------------------------------------------------------------------
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  title text not null,
  exercise_type text,
  scheduled_date date not null,
  scheduled_time text,
  recurring text not null default 'none' check (recurring in ('none', 'daily', 'weekly')),
  reminder_enabled boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists todos_user_date_idx on todos (user_id, scheduled_date);

alter table todos enable row level security;

-- ---------------------------------------------------------------------
-- logs
-- ---------------------------------------------------------------------
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  todo_id uuid references todos(id) on delete set null,
  exercise_type text not null,
  date date not null,
  sets integer,
  reps integer,
  duration_min numeric,
  weight_kg numeric,
  note text,
  exercises jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists logs_user_date_idx on logs (user_id, date desc);

alter table logs enable row level security;

-- ---------------------------------------------------------------------
-- meals
-- ---------------------------------------------------------------------
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  name text not null,
  calories integer not null,
  date date not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists meals_user_date_idx on meals (user_id, date desc);

alter table meals enable row level security;

-- ---------------------------------------------------------------------
-- presets
-- ---------------------------------------------------------------------
create table if not exists presets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  name text not null,
  exercise_type text,
  created_at timestamptz not null default now()
);

create index if not exists presets_user_idx on presets (user_id, created_at asc);

alter table presets enable row level security;

-- ---------------------------------------------------------------------
-- profiles  (one row per user)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  user_id text primary key references users(id) on delete cascade,
  weight_kg numeric not null,
  height_cm numeric not null,
  age integer not null,
  gender text not null check (gender in ('male', 'female')),
  activity_level text not null check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- No policies are created on purpose — see the note at the top of this file.
