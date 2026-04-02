-- UberHelperMVP backend schema (PostgreSQL)
-- v1 tables: users, worker_profiles, jobs, job_offers, job_events, fees

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Enums as CHECK constraints (MVP-friendly).

create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    role text not null check (role in ('client','worker','admin')),
    phone text not null,
    is_phone_verified boolean not null default false,
    rating_avg numeric(3,2) not null default 0,
    rating_count integer not null default 0,
    created_at timestamptz not null default now()
);

create unique index if not exists users_phone_unique on users(phone);

create table if not exists worker_profiles (
    user_id uuid primary key references users(id) on delete cascade,
    categories text[] not null default array[]::text[],
    is_approved boolean not null default false,
    is_available boolean not null default false,
    last_seen_at timestamptz,
    last_known_lat numeric(9,6),
    last_known_lon numeric(9,6),
    updated_at timestamptz not null default now()
);

create table if not exists jobs (
    id uuid primary key default gen_random_uuid(),
    client_id uuid not null references users(id),
    worker_id uuid references users(id),
    category text not null default 'QuickHelper',
    status text not null check (
        status in ('Requested','Offered','Accepted','Arrived','Started','Completed','Cancelled')
    ),
    pickup_address text,
    pickup_lat numeric(9,6),
    pickup_lon numeric(9,6),
    requested_time timestamptz not null default now(),
    scheduled_start_time timestamptz,
    job_duration_hours integer not null,
    job_amount_cash_cents integer not null,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists jobs_client_idx on jobs(client_id);
create index if not exists jobs_status_idx on jobs(status);

create table if not exists job_offers (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references jobs(id) on delete cascade,
    worker_id uuid not null references users(id),
    offered_at timestamptz not null default now(),
    responded_at timestamptz,
    decision text not null check (decision in ('Accepted','Rejected','Timeout')) default 'Timeout'
);

create index if not exists job_offers_job_idx on job_offers(job_id);
create index if not exists job_offers_worker_idx on job_offers(worker_id);

create table if not exists job_events (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references jobs(id) on delete cascade,
    status text not null check (
        status in ('Requested','Offered','Accepted','Arrived','Started','Completed','Cancelled')
    ),
    actor_role text not null check (actor_role in ('client','worker','admin','system')),
    actor_user_id uuid references users(id),
    created_at timestamptz not null default now(),
    meta jsonb not null default '{}'::jsonb
);

create index if not exists job_events_job_idx on job_events(job_id, created_at);

create table if not exists fees (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null unique references jobs(id) on delete cascade,
    fee_percent numeric(4,2) not null default 10.00,
    fee_amount_cents integer not null,
    status text not null check (status in ('Requested','Paid','Reversed','Withheld')) default 'Requested',
    worker_upi_transaction_ref text,
    worker_paid_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists fees_status_idx on fees(status);

