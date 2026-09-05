-- Restrictive P02-only policies make any accidental direct grant fail closed.
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

DROP POLICY IF EXISTS "P02_DenyDirectClientAccess" ON public."TblP02AffinityBoards";
CREATE POLICY "P02_DenyDirectClientAccess" ON public."TblP02AffinityBoards"
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "P02_DenyDirectClientAccess" ON public."TblP02AffinityCategories";
CREATE POLICY "P02_DenyDirectClientAccess" ON public."TblP02AffinityCategories"
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "P02_DenyDirectClientAccess" ON public."TblP02AffinityPlacements";
CREATE POLICY "P02_DenyDirectClientAccess" ON public."TblP02AffinityPlacements"
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
