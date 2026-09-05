-- Indexes are restricted to TblP02* objects.
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_P02_OpenJoinCode"
  ON public."TblP02Discussions" (join_code)
  WHERE status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_P02_TeacherToken"
  ON public."TblP02Discussions" (teacher_token);

CREATE INDEX IF NOT EXISTS "IX_P02_Questions_DiscussionSort"
  ON public."TblP02Questions" (discussion_id, sort_order, id);

CREATE INDEX IF NOT EXISTS "IX_P02_Participants_DiscussionActive"
  ON public."TblP02Participants" (discussion_id, left_at);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_P02_ParticipantToken"
  ON public."TblP02Participants" (participant_token);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_P02_AnswerQuestionParticipant"
  ON public."TblP02Answers" (question_id, participant_id);

CREATE INDEX IF NOT EXISTS "IX_P02_Answers_QuestionSubmitted"
  ON public."TblP02Answers" (question_id, submitted_at);

CREATE INDEX IF NOT EXISTS "IX_P02_AffinityBoards_DiscussionQuestion"
  ON public."TblP02AffinityBoards" (discussion_id, question_id);

CREATE INDEX IF NOT EXISTS "IX_P02_AffinityCategories_BoardSort"
  ON public."TblP02AffinityCategories" (board_id, sort_order);

CREATE INDEX IF NOT EXISTS "IX_P02_AffinityPlacements_CategorySort"
  ON public."TblP02AffinityPlacements" (board_id, category_id, sort_order);
