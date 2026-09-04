-- Emergency P02-only permission repair. Safe to rerun after 04_CreateFunctions.sql.
ALTER TABLE public."TblP02Discussions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TblP02Questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TblP02Participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TblP02Answers" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."TblP02Discussions" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."TblP02Questions" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."TblP02Participants" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."TblP02Answers" FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public."P02_CreateDiscussion"() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_JoinDiscussion"(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_ResumeDiscussion"(bigint, bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_GetTeacherState"(bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_GetQuestions"(bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_AddQuestion"(bigint, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_SetActiveQuestion"(bigint, text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_CloseDiscussion"(bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_GetStudentState"(bigint, bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_SubmitAnswer"(bigint, bigint, bigint, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_LeaveDiscussion"(bigint, bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public."P02_GetQuestionAnswers"(bigint, bigint, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public."P02_CreateDiscussion"() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_JoinDiscussion"(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_ResumeDiscussion"(bigint, bigint, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_GetTeacherState"(bigint, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_GetQuestions"(bigint, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_AddQuestion"(bigint, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_SetActiveQuestion"(bigint, text, bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_CloseDiscussion"(bigint, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_GetStudentState"(bigint, bigint, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_SubmitAnswer"(bigint, bigint, bigint, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_LeaveDiscussion"(bigint, bigint, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public."P02_GetQuestionAnswers"(bigint, bigint, text) TO anon, authenticated;

DROP POLICY IF EXISTS "P02_DenyDirectClientAccess" ON public."TblP02Discussions";
CREATE POLICY "P02_DenyDirectClientAccess" ON public."TblP02Discussions"
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "P02_DenyDirectClientAccess" ON public."TblP02Questions";
CREATE POLICY "P02_DenyDirectClientAccess" ON public."TblP02Questions"
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "P02_DenyDirectClientAccess" ON public."TblP02Participants";
CREATE POLICY "P02_DenyDirectClientAccess" ON public."TblP02Participants"
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "P02_DenyDirectClientAccess" ON public."TblP02Answers";
CREATE POLICY "P02_DenyDirectClientAccess" ON public."TblP02Answers"
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
