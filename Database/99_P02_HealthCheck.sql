-- Read-only checks. Expected result: every row has passed = true.
WITH checks AS (
  SELECT 'TblP02Discussions exists' AS check_name,
         to_regclass('public."TblP02Discussions"') IS NOT NULL AS passed
  UNION ALL SELECT 'TblP02Questions exists',
         to_regclass('public."TblP02Questions"') IS NOT NULL
  UNION ALL SELECT 'TblP02Participants exists',
         to_regclass('public."TblP02Participants"') IS NOT NULL
  UNION ALL SELECT 'TblP02Answers exists',
         to_regclass('public."TblP02Answers"') IS NOT NULL
  UNION ALL SELECT 'RLS enabled on every P02 table',
         (SELECT count(*) = 4 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname IN ('TblP02Discussions','TblP02Questions','TblP02Participants','TblP02Answers')
            AND c.relrowsecurity)
  UNION ALL SELECT 'anon has no direct P02 table privileges',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                     WHERE grantee = 'anon' AND table_schema = 'public'
                       AND table_name IN ('TblP02Discussions','TblP02Questions','TblP02Participants','TblP02Answers'))
  UNION ALL SELECT 'authenticated has no direct P02 table privileges',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                     WHERE grantee = 'authenticated' AND table_schema = 'public'
                       AND table_name IN ('TblP02Discussions','TblP02Questions','TblP02Participants','TblP02Answers'))
  UNION ALL SELECT 'PUBLIC has no direct P02 table privileges',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                     WHERE grantee = 'PUBLIC' AND table_schema = 'public'
                       AND table_name IN ('TblP02Discussions','TblP02Questions','TblP02Participants','TblP02Answers'))
  UNION ALL SELECT 'all 11 P02 RPC functions exist',
         (SELECT count(DISTINCT p.proname) = 11
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname IN ('P02_CreateDiscussion','P02_JoinDiscussion','P02_GetTeacherState',
              'P02_GetQuestions','P02_AddQuestion','P02_SetActiveQuestion','P02_CloseDiscussion',
              'P02_GetStudentState','P02_SubmitAnswer','P02_LeaveDiscussion','P02_GetQuestionAnswers'))
)
SELECT check_name, passed FROM checks ORDER BY check_name;
