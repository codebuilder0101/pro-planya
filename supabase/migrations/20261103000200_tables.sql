-- PlanYá: tables, constraints and indexes.
--
-- Account deletion (required by Apple before store submission) must cascade cleanly:
-- every reference to a user is ON DELETE CASCADE, except moderation history
-- (reports), which keeps the row and sets the user reference to NULL.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger on auth.users insert.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'explorer',
  full_name text not null default '' check (char_length(full_name) <= 80),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 1000),
  bio text not null default '' check (char_length(bio) <= 500),
  -- Category ids the user is interested in; drives the "Para ti" section.
  interests uuid[] not null default '{}' check (cardinality(interests) <= 20),
  city text check (city is null or char_length(city) <= 60),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories: managed by admins.
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 40),
  -- Ionicons glyph name, e.g. 'leaf-outline'.
  icon text not null check (char_length(icon) between 1 and 60),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index categories_sort_idx on public.categories (sort_order, name);

-- ---------------------------------------------------------------------------
-- experiences ("planes"): published by hosts.
-- seats_taken is maintained ONLY by join_experience / cancel_booking.
-- ---------------------------------------------------------------------------
create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 100),
  description text not null check (char_length(btrim(description)) between 1 and 4000),
  category_id uuid not null references public.categories (id),
  location extensions.geography(point, 4326) not null,
  comuna text not null check (char_length(btrim(comuna)) between 1 and 60),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 500),
  seats_taken integer not null default 0,
  is_free boolean not null default true,
  price_clp integer,
  source_name text check (source_name is null or char_length(source_name) <= 80),
  source_url text check (
    source_url is null or (source_url ~* '^https?://[^\s]+$' and char_length(source_url) <= 500)
  ),
  status public.experience_status not null default 'published',
  is_featured boolean not null default false,
  -- Denormalised from experience_photos (first photo by sort_order) by trigger.
  cover_url text,
  -- Denormalised from reviews by trigger.
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiences_time_order check (ends_at > starts_at),
  constraint experiences_seats_range check (seats_taken >= 0 and seats_taken <= capacity),
  constraint experiences_price check (
    (is_free and price_clp is null)
    or (not is_free and price_clp is not null and price_clp between 1 and 10000000)
  )
);

-- Required by nearby search (ST_DWithin on geography uses this GiST index).
create index experiences_location_gix on public.experiences using gist (location);
create index experiences_status_starts_idx on public.experiences (status, starts_at);
create index experiences_host_idx on public.experiences (host_id, starts_at desc);
create index experiences_category_idx on public.experiences (category_id);
create index experiences_featured_idx on public.experiences (starts_at) where is_featured;

-- ---------------------------------------------------------------------------
-- experience_photos: up to 8 per experience; lowest sort_order is the cover.
-- ---------------------------------------------------------------------------
create table public.experience_photos (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  url text not null check (char_length(url) <= 1000),
  -- Path inside the `experience-photos` bucket, used to delete the file.
  storage_path text check (storage_path is null or char_length(storage_path) <= 500),
  sort_order smallint not null default 0 check (sort_order between 0 and 7),
  created_at timestamptz not null default now()
);

create index experience_photos_experience_idx on public.experience_photos (experience_id, sort_order);

-- ---------------------------------------------------------------------------
-- places: curated by admins, shown on Home.
-- ---------------------------------------------------------------------------
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  category_id uuid references public.categories (id) on delete set null,
  location extensions.geography(point, 4326) not null,
  comuna text not null check (char_length(btrim(comuna)) between 1 and 60),
  photo_url text check (photo_url is null or char_length(photo_url) <= 1000),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index places_location_gix on public.places using gist (location);

-- ---------------------------------------------------------------------------
-- bookings: written ONLY through join_experience / cancel_booking.
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seats smallint not null check (seats between 1 and 10),
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint bookings_cancelled_at check ((status = 'cancelled') = (cancelled_at is not null))
);

-- At most one active booking per user per experience (backstop for the function check).
create unique index bookings_one_active_per_user
  on public.bookings (experience_id, user_id)
  where status = 'confirmed';
create index bookings_user_idx on public.bookings (user_id, created_at desc);
create index bookings_experience_idx on public.bookings (experience_id);

-- ---------------------------------------------------------------------------
-- conversations: one per (experience, explorer); created by get_or_create_conversation.
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  explorer_id uuid not null references public.profiles (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_distinct_users check (explorer_id <> host_id),
  constraint conversations_unique unique (experience_id, explorer_id)
);

create index conversations_explorer_idx on public.conversations (explorer_id, last_message_at desc nulls last);
create index conversations_host_idx on public.conversations (host_id, last_message_at desc nulls last);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);
create index messages_unread_idx on public.messages (conversation_id, sender_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  experience_id uuid not null references public.experiences (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, experience_id)
);

create index favorites_user_idx on public.favorites (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reviews: one per user per experience, only after a past confirmed booking.
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  constraint reviews_one_per_user unique (experience_id, author_id)
);

create index reviews_experience_idx on public.reviews (experience_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reports: moderation queue.
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  -- Resolved by trigger from the target, so admins can act on the user
  -- without being able to read private conversations.
  reported_user_id uuid references public.profiles (id) on delete set null,
  reason public.report_reason not null,
  comment text not null default '' check (char_length(comment) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

create index reports_status_idx on public.reports (status, created_at desc);
-- One open report per reporter per target.
create unique index reports_one_open_per_target
  on public.reports (reporter_id, target_type, target_id)
  where status = 'open';

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- push_tokens: Expo push tokens, one row per device.
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique check (char_length(token) between 1 and 300),
  platform public.push_platform not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);
