-- P02 read-only preflight. This file changes no data or permissions.
DO $P02$
DECLARE
  v_has_problem boolean;
BEGIN
  IF to_regclass('public."TblP02Discussions"') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (
      SELECT 1 FROM public."TblP02Discussions"
      WHERE status = ''open''
      GROUP BY join_code HAVING count(*) > 1
    )' INTO STRICT v_has_problem;
    IF v_has_problem THEN
      RAISE EXCEPTION 'P02 preflight failed: duplicate open join_code values exist.';
    END IF;
  END IF;

  IF to_regclass('public."TblP02Answers"') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (
      SELECT 1 FROM public."TblP02Answers"
      GROUP BY question_id, participant_id HAVING count(*) > 1
    )' INTO STRICT v_has_problem;
    IF v_has_problem THEN
      RAISE EXCEPTION 'P02 preflight failed: duplicate answers exist for one participant/question.';
    END IF;
  END IF;
END
$P02$;

SELECT 'P02 preflight passed' AS result;
