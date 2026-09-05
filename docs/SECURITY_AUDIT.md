# P02 V5.2 Security Audit

- Frontend access remains RPC-only.
- No direct `.from()` access to `TblP02...` is permitted.
- V5.2 migration touches only `TblP02Participants` and `P02_...` functions/indexes.
- No `ALTER DEFAULT PRIVILEGES`, `ALL TABLES IN SCHEMA`, or schema-wide GRANT/REVOKE statements are used.
- `anon` and `authenticated` retain no direct table privileges.
- New `P02_SubmitFacilitatorIdea` validates the facilitator token before writing.
- Facilitator ideas reuse the existing answer/affinity pipeline through a single marked facilitator participant row per discussion.
