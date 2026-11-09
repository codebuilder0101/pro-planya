-- PlanYá: private helper functions and triggers.
--
-- Error convention: business-rule violations raise
--   raise exception '<snake_case_code>' using errcode = 'P0001';
-- The app maps each code to a friendly Spanish message (app/src/lib/errors.ts).
--
-- "Trusted" callers: triggers below skip their guards when current_user is not
-- `anon`/`authenticated` (i.e. the table owner inside SECURITY DEFINER functions,
-- migrations/seed, or the service role used by Edge Functions).

-- ---------------------------------------------------------------------------
-- Helper predicates (SECURITY DEFINER so they can be used inside RLS policies
-- without recursion; they live in `private`, so clients cannot call them).
-- ---------------------------------------------------------------------------

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and not p.is_suspended
  );
$$;

create function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and not p.is_suspended
  );
$$;

create function private.is_host()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('host', 'admin') and not p.is_suspended
  );
$$;

-- True when either user has blocked the other. False when any argument is NULL.
create function private.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(a is not null and b is not null and exists (
    select 1 from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  ), false);
$$;

-- True when the current user has a confirmed booking on the experience.
create function private.has_active_booking(p_experience_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.experience_id = p_experience_id
      and b.user_id = (select auth.uid())
      and b.status = 'confirmed'
  );
$$;

-- True when the current user is the host of the experience.
create function private.is_experience_host(p_experience_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.experiences e
    where e.id = p_experience_id and e.host_id = (select auth.uid())
  );
$$;

-- Mirrors the SELECT policy on public.experiences, for use inside SECURITY DEFINER
-- functions (which bypass RLS). Keep both in sync; tests cover them together.
create function private.can_view_experience(p_experience_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.experiences e
    where e.id = p_experience_id
      and (
        e.host_id = (select auth.uid())
        or private.is_admin()
        or (e.status = 'published' and not private.blocked_between(e.host_id, (select auth.uid())))
        or (e.status <> 'removed' and private.has_active_booking(e.id))
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger.
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger experiences_set_updated_at before update on public.experiences
  for each row execute function private.set_updated_at();
create trigger places_set_updated_at before update on public.places
  for each row execute function private.set_updated_at();
create trigger push_tokens_set_updated_at before update on public.push_tokens
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> profile. Role comes from signUp metadata; only explorer/host
-- can be self-selected. Admins are promoted manually (see README).
-- ---------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := 'explorer';
  v_name text := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80);
begin
  if (new.raw_user_meta_data ->> 'role') = 'host' then
    v_role := 'host';
  end if;

  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, v_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- profiles guard: users cannot change their own id, role or suspension.
-- ---------------------------------------------------------------------------
create function private.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or private.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.is_suspended is distinct from old.is_suspended then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function private.profiles_guard();

-- ---------------------------------------------------------------------------
-- experiences guard: protects system-managed columns and status rules.
-- ---------------------------------------------------------------------------
create function private.experiences_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- System-managed columns can never be written by clients (admins included).
  if tg_op = 'INSERT' then
    new.seats_taken := 0;
    new.rating_avg := 0;
    new.rating_count := 0;
    new.cover_url := null;
  else
    new.seats_taken := old.seats_taken;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.cover_url := old.cover_url;
    new.created_at := old.created_at;
  end if;

  if private.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_featured := false;
    if new.status not in ('published', 'hidden') then
      raise exception 'invalid_status' using errcode = 'P0001';
    end if;
    if new.starts_at <= now() then
      raise exception 'starts_in_past' using errcode = 'P0001';
    end if;
    return new;
  end if;

  -- UPDATE by the host.
  if new.host_id is distinct from old.host_id or new.id is distinct from old.id then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if old.status = 'removed' or new.status = 'removed' then
    raise exception 'experience_removed' using errcode = 'P0001';
  end if;
  if old.status = 'cancelled' then
    raise exception 'experience_cancelled' using errcode = 'P0001';
  end if;
  new.is_featured := old.is_featured;
  if new.capacity < old.seats_taken then
    raise exception 'capacity_below_bookings' using errcode = 'P0001';
  end if;
  if new.starts_at is distinct from old.starts_at and new.starts_at <= now() then
    raise exception 'starts_in_past' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger experiences_guard before insert or update on public.experiences
  for each row execute function private.experiences_guard();

-- ---------------------------------------------------------------------------
-- experience_photos: max 8 per experience; keep experiences.cover_url in sync.
-- ---------------------------------------------------------------------------
create function private.experience_photos_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Lock the parent row so concurrent uploads cannot exceed the limit.
  perform 1 from public.experiences where id = new.experience_id for update;
  if (select count(*) from public.experience_photos where experience_id = new.experience_id) >= 8 then
    raise exception 'too_many_photos' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger experience_photos_limit before insert on public.experience_photos
  for each row execute function private.experience_photos_limit();

create function private.sync_experience_cover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_experience_id uuid := coalesce(new.experience_id, old.experience_id);
begin
  update public.experiences e
  set cover_url = (
    select p.url from public.experience_photos p
    where p.experience_id = v_experience_id
    order by p.sort_order, p.created_at, p.id
    limit 1
  )
  where e.id = v_experience_id;

  -- Photo moved to another experience (should not happen, but stay correct).
  if tg_op = 'UPDATE' and new.experience_id is distinct from old.experience_id then
    update public.experiences e
    set cover_url = (
      select p.url from public.experience_photos p
      where p.experience_id = old.experience_id
      order by p.sort_order, p.created_at, p.id
      limit 1
    )
    where e.id = old.experience_id;
  end if;
  return null;
end;
$$;

create trigger experience_photos_sync_cover
  after insert or update or delete on public.experience_photos
  for each row execute function private.sync_experience_cover();

-- ---------------------------------------------------------------------------
-- bookings: if a confirmed booking row is deleted (account deletion cascade),
-- give the seats back.
-- ---------------------------------------------------------------------------
create function private.bookings_release_seats_on_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'confirmed' then
    update public.experiences
    set seats_taken = greatest(seats_taken - old.seats, 0)
    where id = old.experience_id;
  end if;
  return null;
end;
$$;

create trigger bookings_release_seats_on_delete
  after delete on public.bookings
  for each row execute function private.bookings_release_seats_on_delete();

-- ---------------------------------------------------------------------------
-- messages: bump conversations.last_message_at.
-- ---------------------------------------------------------------------------
create function private.messages_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id
    and (last_message_at is null or last_message_at < new.created_at);
  return null;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function private.messages_touch_conversation();

-- Clients cannot forge sender/time.
create function private.messages_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.created_at := now();
    new.read_at := null;
    new.body := btrim(new.body);
  end if;
  return new;
end;
$$;

create trigger messages_before_insert
  before insert on public.messages
  for each row execute function private.messages_before_insert();

-- ---------------------------------------------------------------------------
-- reviews: keep experiences.rating_avg / rating_count in sync.
-- ---------------------------------------------------------------------------
create function private.reviews_sync_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_experience_id uuid := coalesce(new.experience_id, old.experience_id);
begin
  update public.experiences e
  set rating_avg = coalesce(s.avg_rating, 0),
      rating_count = s.cnt
  from (
    select round(avg(r.rating)::numeric, 2) as avg_rating, count(*)::integer as cnt
    from public.reviews r
    where r.experience_id = v_experience_id
  ) s
  where e.id = v_experience_id;
  return null;
end;
$$;

create trigger reviews_sync_rating
  after insert or update or delete on public.reviews
  for each row execute function private.reviews_sync_rating();

create function private.reviews_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.created_at := now();
    new.comment := btrim(coalesce(new.comment, ''));
  end if;
  return new;
end;
$$;

create trigger reviews_before_insert
  before insert on public.reviews
  for each row execute function private.reviews_before_insert();

-- ---------------------------------------------------------------------------
-- reports: resolve the reported user from the target; clients cannot set
-- moderation fields.
-- ---------------------------------------------------------------------------
create function private.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_user uuid;
begin
  if new.target_type = 'experience' then
    select e.host_id into v_user from public.experiences e where e.id = new.target_id;
  elsif new.target_type = 'profile' then
    select p.id into v_user from public.profiles p where p.id = new.target_id;
  elsif new.target_type = 'conversation' then
    select case when c.explorer_id = v_uid then c.host_id else c.explorer_id end
      into v_user
    from public.conversations c
    where c.id = new.target_id
      and v_uid in (c.explorer_id, c.host_id);
  end if;

  if v_user is null then
    raise exception 'report_target_not_found' using errcode = 'P0001';
  end if;
  if v_user = v_uid then
    raise exception 'cannot_report_self' using errcode = 'P0001';
  end if;

  new.reported_user_id := v_user;
  new.status := 'open';
  new.resolved_at := null;
  new.resolved_by := null;
  new.created_at := now();
  new.comment := btrim(coalesce(new.comment, ''));
  return new;
end;
$$;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function private.reports_before_insert();
