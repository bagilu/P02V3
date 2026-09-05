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

`10_P02_V4.1_ActivationAndResume.sql` is only for a database that already completed the V4.0 installation. A fresh installation does not need it because `04_CreateFunctions.sql` already contains the V4.1 functions.

`11_P02_V5.0_AffinityGrouping.sql` is the only database file required when upgrading an existing V4.2 installation to V5.0. Run it before publishing the V5.0 frontend. A fresh installation does not need it because files `01` through `07` already include the V5.0 objects.

All scripts are limited to the seven `TblP02...` tables and seventeen `P02_...` functions. They contain no schema-wide grants, revokes, default privileges, or operations on another P project.

For an existing v3 database, the full deployment preserves rows and adds `participant_token` and `closed_at`. Existing browser sessions do not have the new participant token, so students should rejoin after that upgrade. The V4.2 to V5.0 upgrade only adds affinity-grouping objects and preserves current student sessions. Always deploy the database files before publishing the matching frontend.
