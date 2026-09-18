create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  salary_min integer,
  salary_max integer,
  location text,
  status text not null default 'wishlist'
    check (status in ('wishlist', 'applied', 'interviewing', 'offer', 'rejected')),
  tags text[] not null default '{}',
  next_follow_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on applications(user_id);
create index if not exists applications_status_idx on applications(user_id, status);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists notes_application_id_idx on notes(application_id);
