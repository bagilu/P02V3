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
  UNION ALL SELECT 'TblP02AffinityBoards exists',
         to_regclass('public."TblP02AffinityBoards"') IS NOT NULL
  UNION ALL SELECT 'TblP02AffinityCategories exists',
         to_regclass('public."TblP02AffinityCategories"') IS NOT NULL
  UNION ALL SELECT 'TblP02AffinityPlacements exists',
         to_regclass('public."TblP02AffinityPlacements"') IS NOT NULL
  UNION ALL SELECT 'RLS enabled on every P02 table',
         (SELECT count(*) = 7 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname IN ('TblP02Discussions','TblP02Questions','TblP02Participants','TblP02Answers',
              'TblP02AffinityBoards','TblP02AffinityCategories','TblP02AffinityPlacements')
            AND c.relrowsecurity)
  UNION ALL SELECT 'anon has no direct P02 table privileges',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                     WHERE grantee = 'anon' AND table_schema = 'public'
                       AND table_name IN ('TblP02Discussions','TblP02Questions','TblP02Participants','TblP02Answers',
                         'TblP02AffinityBoards','TblP02AffinityCategories','TblP02AffinityPlacements'))
  UNION ALL SELECT 'authenticated has no direct P02 table privileges',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                     WHERE grantee = 'authenticated' AND table_schema = 'public'
                       AND table_name IN ('TblP02Discussions','TblP02Questions','TblP02Participants','TblP02Answers',
                         'TblP02AffinityBoards','TblP02AffinityCategories','TblP02AffinityPlacements'))
  UNION ALL SELECT 'PUBLIC has no direct P02 table privileges',
         NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
                     WHERE grantee = 'PUBLIC' AND table_schema = 'public'
                       AND table_name IN ('TblP02Discussions','TblP02Questions','TblP02Participants','TblP02Answers',
                         'TblP02AffinityBoards','TblP02AffinityCategories','TblP02AffinityPlacements'))
  UNION ALL SELECT 'all 17 P02 RPC functions exist',
         (SELECT count(DISTINCT p.proname) = 17
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'
            AND p.proname IN ('P02_CreateDiscussion','P02_JoinDiscussion','P02_GetTeacherState',
              'P02_GetQuestions','P02_AddQuestion','P02_SetActiveQuestion','P02_CloseDiscussion',
              'P02_GetStudentState','P02_SubmitAnswer','P02_LeaveDiscussion','P02_GetQuestionAnswers',
              'P02_ResumeDiscussion','P02_GetAffinityBoard','P02_CreateAffinityCategory',
              'P02_RenameAffinityCategory','P02_DeleteAffinityCategory','P02_MoveAffinityAnswer'))
)
SELECT check_name, passed FROM checks ORDER BY check_name;
