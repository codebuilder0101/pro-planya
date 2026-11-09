-- PlanYá: RPC functions exposed through the API (called with supabase.rpc()).
-- Errors follow the convention in the helpers migration ('P0001' + code).

-- ---------------------------------------------------------------------------
-- join_experience: the ONLY way to create a booking.
-- Locks the experience row, so two users racing for the last seat are
-- serialised: the second one sees the updated seats_taken and fails.
-- ---------------------------------------------------------------------------
create function public.join_experience(p_experience_id uuid, p_seats integer default 1)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_exp public.experiences%rowtype;
  v_booking public.bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if not private.is_active_user() then
    raise exception 'account_suspended' using errcode = 'P0001';
  end if;
  if p_seats is null or p_seats < 1 or p_seats > 10 then
    raise exception 'invalid_seats' using errcode = 'P0001';
  end if;

  select * into v_exp
  from public.experiences
  where id = p_experience_id
  for update;

  if not found or not private.can_view_experience(p_experience_id) then
    raise exception 'experience_not_found' using errcode = 'P0001';
  end if;
  if v_exp.host_id = v_uid then
    raise exception 'own_experience' using errcode = 'P0001';
  end if;
  if v_exp.status <> 'published' or private.blocked_between(v_exp.host_id, v_uid) then
    raise exception 'experience_not_available' using errcode = 'P0001';
  end if;
  if v_exp.starts_at <= now() then
    raise exception 'experience_started' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.experience_id = p_experience_id and b.user_id = v_uid and b.status = 'confirmed'
  ) then
    raise exception 'already_joined' using errcode = 'P0001';
  end if;
  if v_exp.seats_taken + p_seats > v_exp.capacity then
    raise exception 'not_enough_seats' using errcode = 'P0001';
  end if;

  insert into public.bookings (experience_id, user_id, seats, status)
  values (p_experience_id, v_uid, p_seats, 'confirmed')
  returning * into v_booking;

  update public.experiences
  set seats_taken = seats_taken + p_seats
  where id = p_experience_id;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_booking: the ONLY way to cancel a booking; returns the seats.
-- Lock order (experience, then booking) matches join_experience to avoid deadlocks.
-- ---------------------------------------------------------------------------
create function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_experience_id uuid;
  v_exp public.experiences%rowtype;
  v_booking public.bookings%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select b.experience_id into v_experience_id
  from public.bookings b
  where b.id = p_booking_id and b.user_id = v_uid;

  if v_experience_id is null then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  select * into v_exp from public.experiences where id = v_experience_id for update;
  select * into v_booking from public.bookings where id = p_booking_id for update;

  if v_booking.status <> 'confirmed' then
    raise exception 'booking_not_active' using errcode = 'P0001';
  end if;
  if v_exp.starts_at <= now() then
    raise exception 'experience_started' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'cancelled', cancelled_at = now()
  where id = p_booking_id
  returning * into v_booking;

  update public.experiences
  set seats_taken = greatest(seats_taken - v_booking.seats, 0)
  where id = v_experience_id;

  return v_booking;
end;
$$;

-- ---------------------------------------------------------------------------
-- search_experiences: discovery query used by Home, Explore and the map.
-- SECURITY INVOKER so the experiences RLS policy (blocks!) applies.
-- Only future, published plans. Date filters are local dates in
-- America/Santiago (inclusive range). Distances are straight-line km.
-- ---------------------------------------------------------------------------
create function public.search_experiences(
  p_query text default null,
  p_category_ids uuid[] default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_date_from date default null,
  p_date_to date default null,
  p_free_only boolean default false,
  p_featured_only boolean default false,
  p_sort text default 'soonest',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  host_id uuid,
  title text,
  category_id uuid,
  comuna text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  seats_taken integer,
  is_free boolean,
  price_clp integer,
  cover_url text,
  is_featured boolean,
  rating_avg numeric,
  rating_count integer,
  lat double precision,
  lng double precision,
  distance_km double precision
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_origin extensions.geography;
  v_query text := nullif(btrim(coalesce(p_query, '')), '');
  v_pattern text;
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if p_lat is not null and p_lng is not null then
    if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      raise exception 'invalid_location' using errcode = 'P0001';
    end if;
    v_origin := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  end if;

  if p_radius_km is not null then
    if v_origin is null then
      raise exception 'location_required' using errcode = 'P0001';
    end if;
    if p_radius_km <= 0 or p_radius_km > 500 then
      raise exception 'invalid_radius' using errcode = 'P0001';
    end if;
  end if;

  if p_sort not in ('soonest', 'distance', 'popular') then
    raise exception 'invalid_sort' using errcode = 'P0001';
  end if;

  if v_query is not null then
    -- Escape LIKE wildcards typed by the user, then match accent-insensitively.
    v_pattern := '%' || extensions.unaccent(lower(
      replace(replace(replace(left(v_query, 100), '\', '\\'), '%', '\%'), '_', '\_')
    )) || '%';
  end if;

  return query
  select
    e.id,
    e.host_id,
    e.title,
    e.category_id,
    e.comuna,
    e.starts_at,
    e.ends_at,
    e.capacity,
    e.seats_taken,
    e.is_free,
    e.price_clp,
    e.cover_url,
    e.is_featured,
    e.rating_avg,
    e.rating_count,
    extensions.st_y(e.location::extensions.geometry),
    extensions.st_x(e.location::extensions.geometry),
    case when v_origin is null then null
         else round((extensions.st_distance(e.location, v_origin) / 1000.0)::numeric, 2)::double precision
    end
  from public.experiences e
  where e.status = 'published'
    and e.starts_at > now()
    and (
      v_pattern is null
      or extensions.unaccent(lower(e.title)) like v_pattern
      or extensions.unaccent(lower(e.description)) like v_pattern
      or extensions.unaccent(lower(e.comuna)) like v_pattern
    )
    and (p_category_ids is null or cardinality(p_category_ids) = 0 or e.category_id = any (p_category_ids))
    and (p_radius_km is null or extensions.st_dwithin(e.location, v_origin, p_radius_km * 1000.0))
    and (p_date_from is null or e.starts_at >= (p_date_from::timestamp at time zone 'America/Santiago'))
    and (p_date_to is null or e.starts_at < ((p_date_to + 1)::timestamp at time zone 'America/Santiago'))
    and (not coalesce(p_free_only, false) or e.is_free)
    and (not coalesce(p_featured_only, false) or e.is_featured)
  order by
    case when p_sort = 'distance' and v_origin is not null
         then extensions.st_distance(e.location, v_origin) end asc nulls last,
    case when p_sort = 'popular' then e.seats_taken end desc nulls last,
    e.starts_at asc,
    e.id asc
  limit v_limit
  offset v_offset;
end;
$$;

-- ---------------------------------------------------------------------------
-- nearby_experiences: plans within p_radius_km of a point, nearest first,
-- with distance_km (PostGIS ST_DWithin + GiST index, via search_experiences).
-- ---------------------------------------------------------------------------
create function public.nearby_experiences(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 10,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  host_id uuid,
  title text,
  category_id uuid,
  comuna text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  seats_taken integer,
  is_free boolean,
  price_clp integer,
  cover_url text,
  is_featured boolean,
  rating_avg numeric,
  rating_count integer,
  lat double precision,
  lng double precision,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from public.search_experiences(
    p_query => null,
    p_category_ids => null,
    p_lat => p_lat,
    p_lng => p_lng,
    p_radius_km => coalesce(p_radius_km, 10),
    p_sort => 'distance',
    p_limit => p_limit,
    p_offset => p_offset
  );
$$;

-- Count for the Home "nearby" map preview.
create function public.count_nearby_experiences(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 10
)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from public.experiences e
  where e.status = 'published'
    and e.starts_at > now()
    and extensions.st_dwithin(
      e.location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      least(greatest(coalesce(p_radius_km, 10), 0), 500) * 1000.0
    );
$$;

-- ---------------------------------------------------------------------------
-- experience_participants: public info of confirmed participants. Bookings are
-- private (booker + host only), so this exposes just name/avatar/seats.
-- ---------------------------------------------------------------------------
create function public.experience_participants(p_experience_id uuid)
returns table (user_id uuid, full_name text, avatar_url text, seats smallint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.can_view_experience(p_experience_id) then
    return;
  end if;

  return query
  select p.id, p.full_name, p.avatar_url, b.seats
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  where b.experience_id = p_experience_id
    and b.status = 'confirmed'
    and not private.blocked_between(p.id, (select auth.uid()))
  order by b.created_at, b.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------
create function public.get_or_create_conversation(p_experience_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_host uuid;
  v_conv public.conversations%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if not private.is_active_user() then
    raise exception 'account_suspended' using errcode = 'P0001';
  end if;

  select e.host_id into v_host from public.experiences e where e.id = p_experience_id;

  if v_host is null or not private.can_view_experience(p_experience_id) then
    raise exception 'experience_not_found' using errcode = 'P0001';
  end if;
  if v_host = v_uid then
    raise exception 'own_experience' using errcode = 'P0001';
  end if;
  if private.blocked_between(v_host, v_uid) then
    raise exception 'blocked' using errcode = 'P0001';
  end if;

  insert into public.conversations (experience_id, explorer_id, host_id)
  values (p_experience_id, v_uid, v_host)
  on conflict (experience_id, explorer_id) do nothing;

  select * into v_conv
  from public.conversations c
  where c.experience_id = p_experience_id and c.explorer_id = v_uid;

  return v_conv;
end;
$$;

create function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and v_uid in (c.explorer_id, c.host_id)
      and not private.blocked_between(c.explorer_id, c.host_id)
  ) then
    raise exception 'conversation_not_found' using errcode = 'P0001';
  end if;

  update public.messages m
  set read_at = now()
  where m.conversation_id = p_conversation_id
    and m.sender_id <> v_uid
    and m.read_at is null;
end;
$$;

-- Conversation list for the current user (SECURITY INVOKER: RLS applies).
create function public.list_my_conversations(p_limit integer default 20, p_offset integer default 0)
returns table (
  id uuid,
  experience_id uuid,
  experience_title text,
  experience_cover_url text,
  other_user_id uuid,
  other_full_name text,
  other_avatar_url text,
  last_message_body text,
  last_message_sender_id uuid,
  last_message_at timestamptz,
  unread_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.experience_id,
    e.title,
    e.cover_url,
    o.id,
    o.full_name,
    o.avatar_url,
    lm.body,
    lm.sender_id,
    coalesce(c.last_message_at, c.created_at),
    (
      select count(*)::integer from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> (select auth.uid())
        and m.read_at is null
    )
  from public.conversations c
  left join public.experiences e on e.id = c.experience_id
  join public.profiles o
    on o.id = case when c.explorer_id = (select auth.uid()) then c.host_id else c.explorer_id end
  left join lateral (
    select m.body, m.sender_id
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc, m.id desc
    limit 1
  ) lm on true
  where (select auth.uid()) in (c.explorer_id, c.host_id)
  order by coalesce(c.last_message_at, c.created_at) desc, c.id
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ---------------------------------------------------------------------------
-- Push tokens: a device token belongs to the last user who signed in on it.
-- ---------------------------------------------------------------------------
create function public.register_push_token(p_token text, p_platform public.push_platform)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_token is null or char_length(p_token) not between 1 and 300 then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;

  insert into public.push_tokens (user_id, token, platform)
  values (v_uid, p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: user search (needs auth.users.email, which clients cannot read).
-- ---------------------------------------------------------------------------
create function public.admin_list_users(
  p_query text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  role public.user_role,
  city text,
  avatar_url text,
  is_suspended boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pattern text;
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if nullif(btrim(coalesce(p_query, '')), '') is not null then
    v_pattern := '%' || extensions.unaccent(lower(
      replace(replace(replace(left(btrim(p_query), 100), '\', '\\'), '%', '\%'), '_', '\_')
    )) || '%';
  end if;

  return query
  select p.id, u.email::text, p.full_name, p.role, p.city, p.avatar_url, p.is_suspended, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where v_pattern is null
     or extensions.unaccent(lower(p.full_name)) like v_pattern
     or lower(u.email::text) like v_pattern
  order by p.created_at desc, p.id
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
