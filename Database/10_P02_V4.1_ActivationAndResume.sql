-- Incremental upgrade from P02 V4.0 to V4.1.
-- This file changes only P02 functions and permissions; it does not alter or delete data.

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

REVOKE EXECUTE ON FUNCTION public."P02_ResumeDiscussion"(bigint, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public."P02_ResumeDiscussion"(bigint, bigint, text) TO anon, authenticated;
