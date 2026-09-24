-- Leads submitted through the contact form on novum-foods.com.
create table if not exists public.contact_submissions (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  role                text,
  full_name           text not null,
  company             text,
  email               text not null,
  message             text,
  source_page         text,
  user_agent          text,
  status              text not null default 'new'
                        check (status in ('new', 'contacted', 'qualified', 'closed', 'spam')),
  confirmation_sent   boolean not null default false,
  confirmation_error  text
);

create index if not exists contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);
create index if not exists contact_submissions_email_idx
  on public.contact_submissions (lower(email));

-- Only the `contact` edge function (service role) writes here. With RLS on and
-- no policies, the public anon key can neither read nor insert.
alter table public.contact_submissions enable row level security;
