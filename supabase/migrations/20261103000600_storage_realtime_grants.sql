-- PlanYá: storage buckets + policies, realtime publication, and privileges.

-- ---------------------------------------------------------------------------
-- Storage. Public-read buckets (images are not secret); writes are restricted.
-- Object paths: avatars/<uid>/<file>, experience-photos/<uid>/<experience>/<file>,
-- places/<file> (admin only). Images are compressed client-side (~1600 px).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('experience-photos', 'experience-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('places', 'places', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Owner-folder buckets: the first path segment must be the user's id.
create policy "avatars_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "experience_photos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'experience-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "experience_photos_insert_host" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'experience-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_host())
  );
create policy "experience_photos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'experience-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'experience-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "experience_photos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'experience-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "places_select_admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'places' and (select private.is_admin()));
create policy "places_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'places' and (select private.is_admin()));
create policy "places_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'places' and (select private.is_admin()))
  with check (bucket_id = 'places' and (select private.is_admin()));
create policy "places_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'places' and (select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Realtime (postgres_changes respects RLS for each subscriber).
--   messages:    live chat
--   experiences: lists refresh when plans are published/edited/hidden
--   bookings:    seats/booking state refresh for booker and host
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.experiences;
alter publication supabase_realtime add table public.bookings;

-- ---------------------------------------------------------------------------
-- Privileges. Supabase grants ALL on new public objects to anon/authenticated by
-- default; tighten that here. RLS still applies on top of these grants.
-- NOTE: every future migration that adds a table or function must repeat the
-- relevant revokes (tests/db.test.mjs fails if anon can reach anything).
-- ---------------------------------------------------------------------------

-- The app requires login: anon gets nothing in public.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

-- private helpers: callable from policies (authenticated) but not exposed by the API.
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated, service_role;

-- Write paths that must go through functions/triggers only.
revoke insert, update, delete, truncate on public.bookings from authenticated;
revoke insert, update, delete, truncate on public.conversations from authenticated;
revoke update, delete, truncate on public.messages from authenticated;
revoke update, delete, truncate on public.reviews from authenticated;
revoke insert, delete, truncate on public.profiles from authenticated;
revoke delete, truncate on public.experiences from authenticated;
revoke insert, update, truncate on public.push_tokens from authenticated;
revoke update, truncate on public.favorites from authenticated;
revoke update, truncate on public.blocks from authenticated;
revoke delete, truncate on public.reports from authenticated;
revoke truncate on public.categories, public.places, public.experience_photos from authenticated;

-- Hide internal columns from direct writes even if a policy were loosened later.
revoke update on public.experiences from authenticated;
grant update (
  title, description, category_id, location, comuna, starts_at, ends_at, capacity,
  is_free, price_clp, source_name, source_url, status, is_featured
) on public.experiences to authenticated;

revoke insert on public.experiences from authenticated;
-- `id` is insertable so the app can pre-generate it and upload photos under it.
grant insert (
  id, host_id, title, description, category_id, location, comuna, starts_at, ends_at, capacity,
  is_free, price_clp, source_name, source_url, status
) on public.experiences to authenticated;
