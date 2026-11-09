-- PlanYá: extensions, schemas and enum types.
--
-- Conventions (see docs/conventions.md):
--   * `public`  : tables and RPC functions exposed through the Supabase API.
--   * `private` : helper and trigger functions. NOT exposed through the API, so
--                 SECURITY DEFINER helpers cannot be called directly by clients.

create extension if not exists postgis with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.user_role as enum ('explorer', 'host', 'admin');

-- published: visible in discovery
-- hidden:    hidden by its host (host can publish it again)
-- cancelled: cancelled by its host (terminal)
-- removed:   hidden by an admin through moderation (only an admin can undo it)
create type public.experience_status as enum ('published', 'hidden', 'cancelled', 'removed');

create type public.booking_status as enum ('confirmed', 'cancelled');

create type public.report_target as enum ('experience', 'profile', 'conversation');
create type public.report_reason as enum ('spam', 'offensive', 'fraud', 'other');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

create type public.push_platform as enum ('ios', 'android');
