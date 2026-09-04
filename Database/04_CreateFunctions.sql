-- All client operations are routed through P02-only token-validating functions.
-- Each SECURITY DEFINER function fixes search_path and fully qualifies every object.

CREATE OR REPLACE FUNCTION public."P02_CreateDiscussion"()
RETURNS TABLE (
  id bigint,
  join_code text,
  teacher_token text,
  status text,
  active_question_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
DECLARE
  v_code text;
  v_try integer;
BEGIN
  FOR v_try IN 1..50 LOOP
    v_code := (1000 + floor(random() * 9000))::integer::text;
    BEGIN
      RETURN QUERY
      INSERT INTO public."TblP02Discussions" AS d (join_code, status)
      VALUES (v_code, 'open')
      RETURNING d.id::bigint, d.join_code::text, d.teacher_token::text,
                d.status::text, d.active_question_id::bigint;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
  RAISE EXCEPTION '目前無法產生可用的 4 位數討論代碼，請稍後再試。';
END
$P02$;

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
    RAISE EXCEPTION '請輸入正確的 4 位數討論區編號。';
  END IF;
  IF char_length(v_nickname) < 1 OR char_length(v_nickname) > 50 THEN
    RAISE EXCEPTION '暱稱長度必須為 1 到 50 個字元。';
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
    AND lower(p.nickname) = lower(v_nickname)
  ORDER BY p.id DESC
  LIMIT 1;

  IF FOUND AND v_participant.left_at IS NULL THEN
    RAISE EXCEPTION '此暱稱已有人使用，請改用其他暱稱。';
  ELSIF FOUND THEN
    UPDATE public."TblP02Participants" AS p
    SET left_at = NULL,
        joined_at = now(),
        participant_token = gen_random_uuid()
    WHERE p.id = v_participant.id
    RETURNING p.* INTO v_participant;
  ELSE
    INSERT INTO public."TblP02Participants" AS p (discussion_id, nickname)
    VALUES (v_discussion.id, v_nickname)
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

CREATE OR REPLACE FUNCTION public."P02_ResumeDiscussion"(
  p_discussion_id bigint,
  p_participant_id bigint,
  p_participant_token text
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
BEGIN
  RETURN QUERY
  SELECT d.id::bigint, d.join_code::text, d.status::text,
         p.id::bigint, p.nickname::text, p.participant_token::text
  FROM public."TblP02Participants" AS p
  JOIN public."TblP02Discussions" AS d ON d.id = p.discussion_id
  WHERE p.id = p_participant_id
    AND p.discussion_id = p_discussion_id
    AND p.participant_token::text = p_participant_token
    AND p.left_at IS NULL
    AND d.status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION '原討論已結束或續接資料失效，請重新加入。';
  END IF;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_GetTeacherState"(
  p_discussion_id bigint,
  p_teacher_token text
)
RETURNS TABLE (
  id bigint,
  join_code text,
  status text,
  active_question_id bigint,
  active_question_text text,
  title text,
  participant_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."TblP02Discussions" AS d
    WHERE d.id = p_discussion_id AND d.teacher_token::text = p_teacher_token
  ) THEN
    RAISE EXCEPTION '教師權杖驗證失敗。';
  END IF;

  RETURN QUERY
  SELECT d.id::bigint, d.join_code::text, d.status::text,
         d.active_question_id::bigint, q.question_text::text, d.title::text,
         (SELECT count(*)::bigint
          FROM public."TblP02Participants" AS p
          WHERE p.discussion_id = d.id AND p.left_at IS NULL)
  FROM public."TblP02Discussions" AS d
  LEFT JOIN public."TblP02Questions" AS q ON q.id = d.active_question_id
  WHERE d.id = p_discussion_id;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_GetQuestions"(
  p_discussion_id bigint,
  p_teacher_token text
)
RETURNS TABLE (
  id bigint,
  discussion_id bigint,
  question_text text,
  sort_order integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."TblP02Discussions" AS d
    WHERE d.id = p_discussion_id AND d.teacher_token::text = p_teacher_token
  ) THEN
    RAISE EXCEPTION '教師權杖驗證失敗。';
  END IF;

  RETURN QUERY
  SELECT q.id::bigint, q.discussion_id::bigint, q.question_text::text,
         q.sort_order::integer, q.created_at::timestamptz
  FROM public."TblP02Questions" AS q
  WHERE q.discussion_id = p_discussion_id
  ORDER BY q.sort_order, q.id;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_AddQuestion"(
  p_discussion_id bigint,
  p_teacher_token text,
  p_question_text text
)
RETURNS TABLE (
  id bigint,
  discussion_id bigint,
  question_text text,
  sort_order integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
DECLARE
  v_text text := btrim(coalesce(p_question_text, ''));
  v_sort integer;
  v_question_id bigint;
BEGIN
  IF char_length(v_text) < 1 OR char_length(v_text) > 2000 THEN
    RAISE EXCEPTION '問題內容長度必須為 1 到 2000 個字元。';
  END IF;

  PERFORM 1 FROM public."TblP02Discussions" AS d
  WHERE d.id = p_discussion_id
    AND d.teacher_token::text = p_teacher_token
    AND d.status = 'open'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '教師權杖驗證失敗，或討論已結束。';
  END IF;

  SELECT coalesce(max(q.sort_order), 0) + 1 INTO v_sort
  FROM public."TblP02Questions" AS q
  WHERE q.discussion_id = p_discussion_id;

  INSERT INTO public."TblP02Questions" AS q (discussion_id, question_text, sort_order)
  VALUES (p_discussion_id, v_text, v_sort)
  RETURNING q.id::bigint INTO v_question_id;

  -- The first question becomes visible immediately. Later questions remain selectable.
  UPDATE public."TblP02Discussions" AS d
  SET active_question_id = v_question_id
  WHERE d.id = p_discussion_id AND d.active_question_id IS NULL;

  RETURN QUERY
  SELECT q.id::bigint, q.discussion_id::bigint, q.question_text::text,
         q.sort_order::integer, q.created_at::timestamptz
  FROM public."TblP02Questions" AS q
  WHERE q.id = v_question_id;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_SetActiveQuestion"(
  p_discussion_id bigint,
  p_teacher_token text,
  p_question_id bigint
)
RETURNS TABLE (id bigint, active_question_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
BEGIN
  PERFORM 1 FROM public."TblP02Discussions" AS d
  WHERE d.id = p_discussion_id
    AND d.teacher_token::text = p_teacher_token
    AND d.status = 'open'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '教師權杖驗證失敗，或討論已結束。';
  END IF;

  PERFORM 1 FROM public."TblP02Questions" AS q
  WHERE q.id = p_question_id AND q.discussion_id = p_discussion_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '指定問題不屬於本討論。';
  END IF;

  RETURN QUERY
  UPDATE public."TblP02Discussions" AS d
  SET active_question_id = p_question_id
  WHERE d.id = p_discussion_id
  RETURNING d.id::bigint, d.active_question_id::bigint;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_CloseDiscussion"(
  p_discussion_id bigint,
  p_teacher_token text
)
RETURNS TABLE (id bigint, join_code text, status text, active_question_id bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
BEGIN
  RETURN QUERY
  UPDATE public."TblP02Discussions" AS d
  SET status = 'closed', active_question_id = NULL, closed_at = now()
  WHERE d.id = p_discussion_id
    AND d.teacher_token::text = p_teacher_token
    AND d.status = 'open'
  RETURNING d.id::bigint, d.join_code::text, d.status::text,
            d.active_question_id::bigint;

  IF NOT FOUND THEN
    RAISE EXCEPTION '教師權杖驗證失敗，或討論已結束。';
  END IF;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_GetStudentState"(
  p_discussion_id bigint,
  p_participant_id bigint,
  p_participant_token text
)
RETURNS TABLE (
  id bigint,
  join_code text,
  status text,
  active_question_id bigint,
  active_question_text text,
  participant_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."TblP02Participants" AS p
    WHERE p.id = p_participant_id
      AND p.discussion_id = p_discussion_id
      AND p.participant_token::text = p_participant_token
      AND p.left_at IS NULL
  ) THEN
    RAISE EXCEPTION '學生身分驗證失敗，請重新加入討論。';
  END IF;

  RETURN QUERY
  SELECT d.id::bigint, d.join_code::text, d.status::text,
         d.active_question_id::bigint, q.question_text::text,
         (SELECT count(*)::bigint
          FROM public."TblP02Participants" AS p2
          WHERE p2.discussion_id = d.id AND p2.left_at IS NULL)
  FROM public."TblP02Discussions" AS d
  LEFT JOIN public."TblP02Questions" AS q
    ON q.id = d.active_question_id AND q.discussion_id = d.id
  WHERE d.id = p_discussion_id;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_SubmitAnswer"(
  p_discussion_id bigint,
  p_question_id bigint,
  p_participant_id bigint,
  p_participant_token text,
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
BEGIN
  IF char_length(v_content) < 1 OR char_length(v_content) > 5000 THEN
    RAISE EXCEPTION '回答長度必須為 1 到 5000 個字元。';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public."TblP02Participants" AS p
    JOIN public."TblP02Discussions" AS d ON d.id = p.discussion_id
    WHERE p.id = p_participant_id
      AND p.discussion_id = p_discussion_id
      AND p.participant_token::text = p_participant_token
      AND p.left_at IS NULL
      AND d.status = 'open'
      AND d.active_question_id = p_question_id
  ) THEN
    RAISE EXCEPTION '身分驗證失敗、討論已結束，或題目已經切換。';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public."TblP02Questions" AS q
    WHERE q.id = p_question_id AND q.discussion_id = p_discussion_id
  ) THEN
    RAISE EXCEPTION '指定問題不屬於本討論。';
  END IF;

  RETURN QUERY
  INSERT INTO public."TblP02Answers" AS a
    (discussion_id, question_id, participant_id, content, submitted_at)
  VALUES
    (p_discussion_id, p_question_id, p_participant_id, v_content, now())
  ON CONFLICT (question_id, participant_id) DO UPDATE
  SET discussion_id = EXCLUDED.discussion_id,
      content = EXCLUDED.content,
      submitted_at = EXCLUDED.submitted_at
  RETURNING a.id::bigint, a.discussion_id::bigint, a.question_id::bigint,
            a.participant_id::bigint, a.content::text, a.submitted_at::timestamptz;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_LeaveDiscussion"(
  p_discussion_id bigint,
  p_participant_id bigint,
  p_participant_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
BEGIN
  UPDATE public."TblP02Participants" AS p
  SET left_at = now()
  WHERE p.id = p_participant_id
    AND p.discussion_id = p_discussion_id
    AND p.participant_token::text = p_participant_token
    AND p.left_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION '學生身分驗證失敗。';
  END IF;
  RETURN true;
END
$P02$;

CREATE OR REPLACE FUNCTION public."P02_GetQuestionAnswers"(
  p_discussion_id bigint,
  p_question_id bigint,
  p_teacher_token text
)
RETURNS TABLE (
  participant_id bigint,
  nickname text,
  submitted_at timestamptz,
  content text,
  question_text text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $P02$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."TblP02Discussions" AS d
    WHERE d.id = p_discussion_id AND d.teacher_token::text = p_teacher_token
  ) THEN
    RAISE EXCEPTION '教師權杖驗證失敗。';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public."TblP02Questions" AS q
    WHERE q.id = p_question_id AND q.discussion_id = p_discussion_id
  ) THEN
    RAISE EXCEPTION '指定問題不屬於本討論。';
  END IF;

  RETURN QUERY
  SELECT p.id::bigint, p.nickname::text, a.submitted_at::timestamptz,
         coalesce(a.content, '')::text, q.question_text::text
  FROM public."TblP02Questions" AS q
  LEFT JOIN public."TblP02Participants" AS p
    ON p.discussion_id = q.discussion_id
  LEFT JOIN public."TblP02Answers" AS a
    ON a.participant_id = p.id AND a.question_id = q.id
  WHERE q.id = p_question_id
    AND q.discussion_id = p_discussion_id
  ORDER BY p.joined_at NULLS FIRST, p.id NULLS FIRST;
END
$P02$;
