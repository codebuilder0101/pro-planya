-- Read RPCs for the plan detail screen and the places carousel.
-- Both return coordinates as plain lat/lng (PostgREST would otherwise send the
-- geography column as EWKB hex) and an optional distance from the viewer.
-- SECURITY INVOKER: the experiences / places / bookings / favorites RLS policies
-- (including blocks) apply exactly as for direct table reads.

-- ---------------------------------------------------------------------------
-- get_experience: one plan with host, category, coordinates, distance and the
-- caller's own booking / favorite state. Returns no row when the caller cannot
-- see the plan (hidden, removed, blocked, unknown id).
-- ---------------------------------------------------------------------------
create function public.get_experience(
  p_experience_id uuid,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (
  id uuid,
  host_id uuid,
  title text,
  description text,
  category_id uuid,
  comuna text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  seats_taken integer,
  is_free boolean,
  price_clp integer,
  source_name text,
  source_url text,
  status public.experience_status,
  is_featured boolean,
  cover_url text,
  rating_avg numeric,
  rating_count integer,
  lat double precision,
  lng double precision,
  distance_km double precision,
  host_full_name text,
  host_avatar_url text,
  host_bio text,
  my_booking_id uuid,
  my_booking_seats smallint,
  is_favorite boolean
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_origin extensions.geography;
  v_uid uuid := (select auth.uid());
begin
  if p_lat is not null and p_lng is not null then
    if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      raise exception 'invalid_location' using errcode = 'P0001';
    end if;
    v_origin := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  end if;

  return query
  select
    e.id,
    e.host_id,
    e.title,
    e.description,
    e.category_id,
    e.comuna,
    e.starts_at,
    e.ends_at,
    e.capacity,
    e.seats_taken,
    e.is_free,
    e.price_clp,
    e.source_name,
    e.source_url,
    e.status,
    e.is_featured,
    e.cover_url,
    e.rating_avg,
    e.rating_count,
    extensions.st_y(e.location::extensions.geometry),
    extensions.st_x(e.location::extensions.geometry),
    case when v_origin is null then null
         else round((extensions.st_distance(e.location, v_origin) / 1000.0)::numeric, 2)::double precision
    end,
    h.full_name,
    h.avatar_url,
    h.bio,
    b.id,
    b.seats,
    exists (
      select 1 from public.favorites f
      where f.experience_id = e.id and f.user_id = v_uid
    )
  from public.experiences e
  join public.profiles h on h.id = e.host_id
  left join public.bookings b
    on b.experience_id = e.id and b.user_id = v_uid and b.status = 'confirmed'
  where e.id = p_experience_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- list_places: recommended places, nearest first when a location is given.
-- ---------------------------------------------------------------------------
create function public.list_places(
  p_lat double precision default null,
  p_lng double precision default null,
  p_category_ids uuid[] default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  description text,
  category_id uuid,
  comuna text,
  photo_url text,
  tags text[],
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
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if p_lat is not null and p_lng is not null then
    if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
      raise exception 'invalid_location' using errcode = 'P0001';
    end if;
    v_origin := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;
  end if;

  return query
  select
    p.id,
    p.name,
    p.description,
    p.category_id,
    p.comuna,
    p.photo_url,
    p.tags,
    extensions.st_y(p.location::extensions.geometry),
    extensions.st_x(p.location::extensions.geometry),
    case when v_origin is null then null
         else round((extensions.st_distance(p.location, v_origin) / 1000.0)::numeric, 2)::double precision
    end
  from public.places p
  where p_category_ids is null or cardinality(p_category_ids) = 0 or p.category_id = any (p_category_ids)
  order by
    case when v_origin is not null then extensions.st_distance(p.location, v_origin) end asc nulls last,
    p.name asc,
    p.id asc
  limit v_limit
  offset v_offset;
end;
$$;

-- Same privilege model as every other public function: authenticated only.
revoke execute on function public.get_experience(uuid, double precision, double precision) from public, anon;
revoke execute on function public.list_places(double precision, double precision, uuid[], integer, integer)
  from public, anon;
grant execute on function public.get_experience(uuid, double precision, double precision)
  to authenticated, service_role;
grant execute on function public.list_places(double precision, double precision, uuid[], integer, integer)
  to authenticated, service_role;
