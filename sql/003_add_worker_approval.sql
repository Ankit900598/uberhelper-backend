-- MVP: worker approval flag for admin console

alter table worker_profiles
add column if not exists is_approved boolean not null default false;

