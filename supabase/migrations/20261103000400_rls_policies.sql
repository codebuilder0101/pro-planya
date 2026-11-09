-- PlanYá: Row Level Security. Enabled on EVERY table; the app requires login,
-- so policies target `authenticated` only (anon has no table privileges at all,
-- see the grants migration).
--
-- `(select auth.uid())` / `(select private.fn())` are wrapped in a sub-select so
-- Postgres evaluates them once per statement instead of once per row.

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.experiences enable row level security;
alter table public.experience_photos enable row level security;
alter table public.places enable row level security;
alter table public.bookings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.push_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: public fields readable; owner edits own; admin edits all.
-- Inserts happen only through the auth trigger. Role/suspension changes are
-- blocked for non-admins by private.profiles_guard.
-- ---------------------------------------------------------------------------
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and (select private.is_active_user()));

create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- categories: everyone reads active ones; admin reads all and writes.
-- ---------------------------------------------------------------------------
create policy "categories_select" on public.categories
  for select to authenticated
  using (is_active or (select private.is_admin()));

create policy "categories_insert_admin" on public.categories
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "categories_update_admin" on public.categories
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "categories_delete_admin" on public.categories
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- experiences: published readable by all (minus blocked hosts); host reads and
-- edits own; participants keep seeing plans they booked (unless removed by an
-- admin); admin all. Keep in sync with private.can_view_experience.
-- ---------------------------------------------------------------------------
create policy "experiences_select" on public.experiences
  for select to authenticated
  using (
    host_id = (select auth.uid())
    or (select private.is_admin())
    or (status = 'published' and not private.blocked_between(host_id, (select auth.uid())))
    or (status <> 'removed' and private.has_active_booking(id))
  );

create policy "experiences_insert_host" on public.experiences
  for insert to authenticated
  with check (host_id = (select auth.uid()) and (select private.is_host()));

create policy "experiences_update_host" on public.experiences
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()) and (select private.is_active_user()));

create policy "experiences_update_admin" on public.experiences
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- No DELETE policy: hosts hide or cancel; history is preserved.

-- ---------------------------------------------------------------------------
-- experience_photos: same visibility as the experience; host/admin write.
-- ---------------------------------------------------------------------------
create policy "experience_photos_select" on public.experience_photos
  for select to authenticated
  using (exists (select 1 from public.experiences e where e.id = experience_id));

create policy "experience_photos_insert" on public.experience_photos
  for insert to authenticated
  with check (
    (private.is_experience_host(experience_id) and (select private.is_active_user()))
    or (select private.is_admin())
  );

create policy "experience_photos_update" on public.experience_photos
  for update to authenticated
  using (private.is_experience_host(experience_id) or (select private.is_admin()))
  with check (
    (private.is_experience_host(experience_id) and (select private.is_active_user()))
    or (select private.is_admin())
  );

create policy "experience_photos_delete" on public.experience_photos
  for delete to authenticated
  using (
    (private.is_experience_host(experience_id) and (select private.is_active_user()))
    or (select private.is_admin())
  );

-- ---------------------------------------------------------------------------
-- places: everyone reads; admin writes.
-- ---------------------------------------------------------------------------
create policy "places_select" on public.places
  for select to authenticated
  using (true);

create policy "places_insert_admin" on public.places
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "places_update_admin" on public.places
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "places_delete_admin" on public.places
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- bookings: booker and that plan's host read; admin reads.
-- Writes ONLY through join_experience / cancel_booking (no write policies, and
-- write privileges are revoked in the grants migration).
-- ---------------------------------------------------------------------------
create policy "bookings_select" on public.bookings
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_experience_host(experience_id)
    or (select private.is_admin())
  );

-- ---------------------------------------------------------------------------
-- conversations: the two participants only, and never between blocked users.
-- Created only through get_or_create_conversation.
-- ---------------------------------------------------------------------------
create policy "conversations_select_participants" on public.conversations
  for select to authenticated
  using (
    (select auth.uid()) in (explorer_id, host_id)
    and not private.blocked_between(explorer_id, host_id)
  );

-- ---------------------------------------------------------------------------
-- messages: the two participants only (visibility inherited from conversations).
-- ---------------------------------------------------------------------------
create policy "messages_select_participants" on public.messages
  for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id));

create policy "messages_insert_participant" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (select private.is_active_user())
    and exists (select 1 from public.conversations c where c.id = conversation_id)
  );

-- ---------------------------------------------------------------------------
-- favorites: owner only; can only favorite experiences the user can see.
-- ---------------------------------------------------------------------------
create policy "favorites_select_own" on public.favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites_insert_own" on public.favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.experiences e where e.id = experience_id)
  );

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- reviews: everyone reads; one per user per plan (unique constraint), only
-- after the plan ended and only with a confirmed booking.
-- ---------------------------------------------------------------------------
create policy "reviews_select" on public.reviews
  for select to authenticated
  using (true);

create policy "reviews_insert_participant" on public.reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.is_active_user())
    and private.has_active_booking(experience_id)
    and exists (
      select 1 from public.experiences e
      where e.id = experience_id
        and e.ends_at < now()
        and e.status in ('published', 'hidden')
    )
  );

-- ---------------------------------------------------------------------------
-- reports: reporter creates; admin reads and resolves.
-- ---------------------------------------------------------------------------
create policy "reports_insert_own" on public.reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select private.is_active_user()));

create policy "reports_select_admin" on public.reports
  for select to authenticated
  using ((select private.is_admin()));

create policy "reports_update_admin" on public.reports
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- blocks: owner only.
-- ---------------------------------------------------------------------------
create policy "blocks_select_own" on public.blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "blocks_insert_own" on public.blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "blocks_delete_own" on public.blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- push_tokens: owner only (registration goes through register_push_token so a
-- device that changes account moves its token cleanly).
-- ---------------------------------------------------------------------------
create policy "push_tokens_select_own" on public.push_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "push_tokens_delete_own" on public.push_tokens
  for delete to authenticated
  using (user_id = (select auth.uid()));
