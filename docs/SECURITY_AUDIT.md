# P02 v3 to v4 security audit

## Findings in v3

- The package had no database creation, RLS, policy, grant, or diagnostic SQL.
- The anonymous browser client performed direct SELECT, INSERT, UPDATE, and UPSERT operations.
- `teacher_token` was selected into the browser before the browser compared it, so database authorization did not depend on the token.
- Student actions trusted numeric participant IDs and had no participant secret.
- Teacher and student identifiers were placed in URLs.
- Supabase Auth session behavior and storage key were not explicitly isolated.

## v4 controls

- Direct table privileges are revoked from `anon` and `authenticated`.
- RLS is enabled with restrictive deny-direct policies on only the four P02 tables.
- Eleven P02-only `SECURITY DEFINER` RPCs validate teacher or participant tokens.
- Every function fixes `search_path` and fully qualifies P02 objects.
- A unique participant token is added without deleting existing rows.
- Sensitive tokens are kept in tab-scoped `sessionStorage` and omitted from URLs.
- Supabase Auth persistence is disabled and a P02-specific `storageKey` is configured.
- Preflight, emergency permission repair, and read-only health-check scripts are included.

## Compatibility note

Students who were already inside an open v3 discussion must rejoin after v4 is deployed because their old browser session does not contain `participant_token`. Historical discussions, questions, participants, and answers remain in the database.
