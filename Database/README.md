# P02 Database deployment

Run each file separately in Supabase SQL Editor and wait for success before continuing:

1. `00_Preflight.sql`
2. `01_CreateTables.sql`
3. `02_CreateIndexes.sql`
4. `03_CreateViews.sql`
5. `04_CreateFunctions.sql`
6. `05_EnableRLS.sql`
7. `06_CreatePolicies.sql`
8. `07_GrantPermissions.sql`
9. `99_P02_HealthCheck.sql`

`90_P02_Permissions.sql` is an emergency repair script. It is not an extra installation step.

All scripts are limited to the four `TblP02...` tables and eleven `P02_...` functions. They contain no schema-wide grants, revokes, default privileges, or operations on another P project.

For an existing v3 database, the deployment preserves rows and adds `participant_token` and `closed_at`. Existing browser sessions do not have the new participant token, so students should rejoin after the upgrade. Deploy the database files before publishing the v4 frontend.
