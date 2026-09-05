# P02 v3 to V5.1 security audit

## Findings in v3

- The package had no database creation, RLS, policy, grant, or diagnostic SQL.
- The anonymous browser client performed direct SELECT, INSERT, UPDATE, and UPSERT operations.
- `teacher_token` was selected into the browser before the browser compared it, so database authorization did not depend on the token.
- Student actions trusted numeric participant IDs and had no participant secret.
- Teacher and student identifiers were placed in URLs.
- Supabase Auth session behavior and storage key were not explicitly isolated.

## V5.0 controls

- Direct table privileges are revoked from `anon` and `authenticated`.
- RLS is enabled with restrictive deny-direct policies on only the seven P02 tables.
- Seventeen P02-only `SECURITY DEFINER` RPCs validate teacher or participant tokens.
- Every function fixes `search_path` and fully qualifies P02 objects.
- A unique participant token is added without deleting existing rows.
- Sensitive tokens are kept in tab-scoped `sessionStorage` and omitted from URLs.
- Supabase Auth persistence is disabled and a P02-specific `storageKey` is configured.
- Preflight, emergency permission repair, and read-only health-check scripts are included.
- Affinity boards, categories, and placements are stored in three P02-only tables; their five RPCs require the teacher token.

## Compatibility note

Students who were already inside an open v3 discussion must rejoin after v4 is deployed because their old browser session does not contain `participant_token`. Historical discussions, questions, participants, and answers remain in the database.


## V5.1 verification

- V5.1 makes no schema, RPC, RLS, policy, grant, or revoke changes.
- Direct-join URLs contain only the non-secret four-digit `join_code`; teacher and participant tokens remain in `sessionStorage`.
- Student direct join continues to call the existing token-issuing `P02_JoinDiscussion` RPC.
- Frontend scan confirms no `.from()` or direct `TblP02...` access was introduced.
- SQL scan confirms no schema-wide `ALTER DEFAULT PRIVILEGES`, `ALL TABLES IN SCHEMA`, or schema-wide GRANT/REVOKE command is present.
