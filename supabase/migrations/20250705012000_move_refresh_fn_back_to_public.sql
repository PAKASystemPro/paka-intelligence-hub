-- Move the refresh function back to the public schema where the orchestrator expects to find it.
ALTER FUNCTION production.refresh_all_materialized_views() SET SCHEMA public;
