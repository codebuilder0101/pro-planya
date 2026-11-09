-- Host "Mis planes": the caller's own plans in any status (published, hidden,
-- cancelled, removed), with coordinates as plain lat/lng. Upcoming plans first
-- (soonest first), then past plans (most recent first).
-- SECURITY INVOKER + `host_id = auth.uid()`: a user only ever sees their own plans.

create function public.list_my_experiences(
  p_limit integer default 50,
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
  status public.experience_status,
  is_featured boolean,
  cover_url text,
  rating_avg numeric,
  rating_count integer,
  lat double precision,
  lng double precision
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset < 0 then
    raise exception 'invalid_page' using errcode = 'P0001';
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
    e.status,
    e.is_featured,
    e.cover_url,
    e.rating_avg,
    e.rating_count,
    extensions.st_y(e.location::extensions.geometry),
    extensions.st_x(e.location::extensions.geometry)
  from public.experiences e
  where e.host_id = v_uid
  order by
    (e.ends_at < now()),
    case when e.ends_at >= now() then e.starts_at end asc,
    e.starts_at desc
  limit p_limit offset p_offset;
end;
$$;

revoke execute on function public.list_my_experiences(integer, integer) from public, anon;
grant execute on function public.list_my_experiences(integer, integer) to authenticated, service_role;
