-- Training App Schema
-- Ejecutar en Supabase SQL Editor

create table if not exists activities (
  id bigserial primary key,
  strava_id bigint unique,
  garmin_id bigint unique,
  date date not null,
  name text,
  type text,
  distance_m float,
  duration_s int,
  avg_hr int,
  max_hr int,
  avg_pace_s_per_km float,
  training_effect float,
  raw_data jsonb,
  created_at timestamptz default now()
);

create table if not exists wellness (
  date date primary key,
  hrv int,
  hrv_status text,
  hrv_baseline_lower int,
  hrv_baseline_upper int,
  sleep_total_s int,
  sleep_deep_s int,
  sleep_rem_s int,
  sleep_score int,
  resting_hr int,
  created_at timestamptz default now()
);

create table if not exists gym_sessions (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  type text not null,
  exercises jsonb not null default '[]',
  duration_min int,
  notes text default '',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists activities_date_idx on activities(date desc);
create index if not exists wellness_date_idx on wellness(date desc);
create index if not exists gym_sessions_date_idx on gym_sessions(date desc);

-- RLS (Row Level Security) — disable for personal app
alter table activities disable row level security;
alter table wellness disable row level security;
alter table gym_sessions disable row level security;
