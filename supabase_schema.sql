-- ═══════════════════════════════════════
-- STAYLO Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════
-- USERS TABLE
-- ═══════════════════════════════════════
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  referral_code text unique,
  referred_by uuid references public.users(id),
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Allow reading referral codes for referral lookups
create policy "Anyone can look up referral codes"
  on public.users for select
  using (true);

-- ═══════════════════════════════════════
-- PROPERTIES TABLE
-- ═══════════════════════════════════════
create type property_type as enum ('hotel', 'guesthouse', 'resort', 'villa', 'hostel');
create type property_status as enum ('pending', 'reviewing', 'validated', 'live');

create table public.properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  type property_type not null default 'hotel',
  country text not null,
  city text not null,
  booking_link text,
  airbnb_link text,
  room_count integer not null default 1,
  avg_nightly_rate decimal(10,2) not null default 0,
  contact_email text not null,
  contact_phone text,
  status property_status not null default 'pending',
  created_at timestamptz default now()
);

alter table public.properties enable row level security;

create policy "Users can read own properties"
  on public.properties for select
  using (auth.uid() = user_id);

create policy "Users can insert own properties"
  on public.properties for insert
  with check (auth.uid() = user_id);

create policy "Users can update own properties"
  on public.properties for update
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- SURVEY ANSWERS TABLE
-- ═══════════════════════════════════════
create table public.survey_answers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id),
  platforms_used text[] not null default '{}',
  commission_pct decimal(5,2),
  biggest_frustration text,
  interest_score integer check (interest_score between 1 and 10),
  would_join boolean,
  room_count integer,
  created_at timestamptz default now()
);

alter table public.survey_answers enable row level security;

create policy "Users can insert survey answers"
  on public.survey_answers for insert
  with check (true);

create policy "Users can read own survey answers"
  on public.survey_answers for select
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════
-- REFERRALS TABLE
-- ═══════════════════════════════════════
create table public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid references public.users(id) on delete cascade not null,
  referred_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

alter table public.referrals enable row level security;

create policy "Users can read own referrals"
  on public.referrals for select
  using (auth.uid() = referrer_id);

create policy "System can insert referrals"
  on public.referrals for insert
  with check (true);

-- ═══════════════════════════════════════
-- WAITLIST TABLE
-- ═══════════════════════════════════════
create table public.waitlist (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  source text,
  created_at timestamptz default now()
);

alter table public.waitlist enable row level security;

create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- ═══════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════
create index idx_users_referral_code on public.users(referral_code);
create index idx_properties_user_id on public.properties(user_id);
create index idx_referrals_referrer_id on public.referrals(referrer_id);
create index idx_survey_user_id on public.survey_answers(user_id);
