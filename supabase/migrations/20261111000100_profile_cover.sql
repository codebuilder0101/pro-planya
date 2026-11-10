-- Profile cover photo: a wide banner image behind the profile header, visible to
-- everyone on the public profile. Stored like the avatar, in the public
-- "avatars" bucket under the owner's folder (<uid>/<file>), so the existing
-- storage policies already restrict uploads to the owner.
-- Owners edit it through the existing profiles_update_own policy.

alter table public.profiles
  add column cover_url text check (cover_url is null or char_length(cover_url) <= 1000);
