-- Enable Row Level Security on all app-owned public tables.
--
-- This app uses direct server-side pg connections rather than Supabase PostgREST,
-- so these tables should not remain exposed without RLS.

ALTER TABLE IF EXISTS admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS config_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS config_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contributor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contributor_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_login_attempts ENABLE ROW LEVEL SECURITY;
