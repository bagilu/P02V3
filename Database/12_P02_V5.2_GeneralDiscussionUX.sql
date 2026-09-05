-- P02 V5.2 only: General Discussion UX database increment.
-- Safe for an existing P02 V5.1.1 database. No schema-wide statements.

ALTER TABLE public."TblP02Participants"
  ADD COLUMN IF NOT EXISTS is_facilitator boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_P02_FacilitatorParticipant"
  ON public."TblP02Participants" (discussion_id)
  WHERE is_facilitator IS TRUE;

CREATE OR REPLACE FUNCTION public."P02_JoinDiscussion"(
  p_join_code text,
  p_nickname text
)
RETURNS TABLE (
  discussion_id bigint,
  join_code text,
  status text,
  participant_id bigint,
  nickname text,
  participant_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
DECLARE
  v_discussion public."TblP02Discussions"%ROWTYPE;
  v_participant public."TblP02Participants"%ROWTYPE;
  v_nickname text := btrim(coalesce(p_nickname, ''));
BEGIN
  IF p_join_code !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION '請輸入正確的 4 位數討論代碼。';
  END IF;
  IF char_length(v_nickname) < 1 OR char_length(v_nickname) > 50 THEN
    RAISE EXCEPTION '暱稱長度必須為 1 到 50 個字元。';
  END IF;
  IF lower(v_nickname) IN (lower('引導者'), lower('Facilitator'), lower('引導者 / Facilitator')) THEN
    RAISE EXCEPTION '此名稱保留給討論引導者使用，請改用其他暱稱。';
  END IF;

  SELECT d.* INTO v_discussion
  FROM public."TblP02Discussions" AS d
  WHERE d.join_code = p_join_code AND d.status = 'open'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '代碼錯誤，或本討論已經結束。';
  END IF;

  SELECT p.* INTO v_participant
  FROM public."TblP02Participants" AS p
  WHERE p.discussion_id = v_discussion.id
    AND p.is_facilitator IS FALSE
    AND lower(p.nickname) = lower(v_nickname)
  ORDER BY p.id DESC
  LIMIT 1;

  IF FOUND AND v_participant.left_at IS NULL THEN
    RAISE EXCEPTION '此暱稱已有人使用，請改用其他暱稱。';
  ELSIF FOUND THEN
    UPDATE public."TblP02Participants" AS p
    SET left_at = NULL,
        joined_at = now(),
        participant_token = gen_random_uuid(),
        is_facilitator = false
    WHERE p.id = v_participant.id
    RETURNING p.* INTO v_participant;
  ELSE
    INSERT INTO public."TblP02Participants" AS p (discussion_id, nickname, is_facilitator)
    VALUES (v_discussion.id, v_nickname, false)
    RETURNING p.* INTO v_participant;
  END IF;

  RETURN QUERY SELECT
    v_discussion.id::bigint,
    v_discussion.join_code::text,
    v_discussion.status::text,
    v_participant.id::bigint,
    v_participant.nickname::text,
    v_participant.participant_token::text;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_GetTeacherState"(
  p_discussion_id bigint,
  p_teacher_token text
)
RETURNS TABLE (
  id bigint, join_code text, status text, active_question_id bigint,
  active_question_text text, title text, participant_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $P02$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."TblP02Discussions" AS d
    WHERE d.id = p_discussion_id AND d.teacher_token::text = p_teacher_token) THEN
    RAISE EXCEPTION '引導者權杖驗證失敗。';
  END IF;
  RETURN QUERY
  SELECT d.id::bigint, d.join_code::text, d.status::text,
         d.active_question_id::bigint, q.question_text::text, d.title::text,
         (SELECT count(*)::bigint FROM public."TblP02Participants" AS p
          WHERE p.discussion_id = d.id AND p.left_at IS NULL AND p.is_facilitator IS FALSE)
  FROM public."TblP02Discussions" AS d
  LEFT JOIN public."TblP02Questions" AS q ON q.id = d.active_question_id
  WHERE d.id = p_discussion_id;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_GetStudentState"(
  p_discussion_id bigint, p_participant_id bigint, p_participant_token text
)
RETURNS TABLE (id bigint, join_code text, status text, active_question_id bigint, active_question_text text, participant_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $P02$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."TblP02Participants" AS p
    WHERE p.id = p_participant_id AND p.discussion_id = p_discussion_id
      AND p.participant_token::text = p_participant_token
      AND p.left_at IS NULL AND p.is_facilitator IS FALSE
  ) THEN RAISE EXCEPTION '參與者身分驗證失敗，請重新加入討論。'; END IF;
  RETURN QUERY
  SELECT d.id::bigint, d.join_code::text, d.status::text,
         d.active_question_id::bigint,
         CASE WHEN q.id IS NULL THEN NULL ELSE ('Q' || q.sort_order::text || '. ' || q.question_text)::text END,
         (SELECT count(*)::bigint FROM public."TblP02Participants" AS p2
          WHERE p2.discussion_id = d.id AND p2.left_at IS NULL AND p2.is_facilitator IS FALSE)
  FROM public."TblP02Discussions" AS d
  LEFT JOIN public."TblP02Questions" AS q ON q.id = d.active_question_id AND q.discussion_id = d.id
  WHERE d.id = p_discussion_id;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_SubmitFacilitatorIdea"(
  p_discussion_id bigint,
  p_question_id bigint,
  p_teacher_token text,
  p_content text
)
RETURNS TABLE (
  id bigint,
  discussion_id bigint,
  question_id bigint,
  participant_id bigint,
  content text,
  submitted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
#variable_conflict use_column
DECLARE
  v_content text := btrim(coalesce(p_content, ''));
  v_facilitator_id bigint;
BEGIN
  IF char_length(v_content) < 1 OR char_length(v_content) > 5000 THEN
    RAISE EXCEPTION '想法長度必須為 1 到 5000 個字元。';
  END IF;

  PERFORM 1
  FROM public."TblP02Discussions" AS d
  WHERE d.id = p_discussion_id
    AND d.teacher_token::text = p_teacher_token
    AND d.status = 'open'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '引導者權杖驗證失敗，或討論已結束。';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public."TblP02Questions" AS q
    WHERE q.id = p_question_id AND q.discussion_id = p_discussion_id
  ) THEN
    RAISE EXCEPTION '指定問題不屬於本討論。';
  END IF;

  INSERT INTO public."TblP02Participants" AS p
    (discussion_id, nickname, is_facilitator, left_at)
  VALUES
    (p_discussion_id, '引導者 / Facilitator', true, NULL)
  ON CONFLICT (discussion_id) WHERE is_facilitator IS TRUE
  DO UPDATE SET nickname = EXCLUDED.nickname, left_at = NULL
  RETURNING p.id INTO v_facilitator_id;

  RETURN QUERY
  INSERT INTO public."TblP02Answers" AS a
    (discussion_id, question_id, participant_id, content, submitted_at)
  VALUES
    (p_discussion_id, p_question_id, v_facilitator_id, v_content, now())
  ON CONFLICT (question_id, participant_id) DO UPDATE
  SET content = EXCLUDED.content,
      submitted_at = EXCLUDED.submitted_at
  RETURNING a.id::bigint, a.discussion_id::bigint, a.question_id::bigint,
            a.participant_id::bigint, a.content::text, a.submitted_at::timestamptz;
END
$P02$;

REVOKE EXECUTE ON FUNCTION public."P02_SubmitFacilitatorIdea"(bigint, bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public."P02_SubmitFacilitatorIdea"(bigint, bigint, text, text) TO anon, authenticated;
