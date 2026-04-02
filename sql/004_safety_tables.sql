-- Safety MVP tables: OTP requests and SOS events

create table if not exists otp_requests (
    id uuid primary key default gen_random_uuid(),
    phone text not null,
    role text not null check (role in ('client','worker')),
    otp_hash text not null,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    attempts_used integer not null default 0,
    is_verified boolean not null default false
);

create index if not exists otp_requests_phone_idx on otp_requests(phone, created_at desc);

create table if not exists sos_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id),
    job_id uuid references jobs(id),
    actor_role text not null check (actor_role in ('client','worker','admin','system')),
    lat numeric(9,6),
    lon numeric(9,6),
    message text,
    status text not null default 'Raised' check (status in ('Raised','Resolved')),
    created_at timestamptz not null default now()
);

create index if not exists sos_events_job_idx on sos_events(job_id, created_at desc);

