-- "Quiero ser anfitrión": an explorer turns their own account into a host account
-- (a host can still explore and join plans). Users cannot change their role
-- directly (private.profiles_guard), so this is the only self-service path, and
-- it only goes explorer -> host. Suspended users cannot use it.
-- SECURITY DEFINER runs as the owner, which the guard allows.

create function public.become_host()
returns public.user_role
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.user_role;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_uid and not p.is_suspended;

  if v_role is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if v_role = 'explorer' then
    update public.profiles set role = 'host' where id = v_uid;
    v_role := 'host';
  end if;

  return v_role;
end;
$$;

revoke execute on function public.become_host() from public, anon;
grant execute on function public.become_host() to authenticated;
