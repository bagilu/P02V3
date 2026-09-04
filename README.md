# P02 BrainStormingSystem V4 Secure

GitHub Pages + Supabase 的課堂腦力激盪系統。本版以 v3 功能為基準，完成 P-SDS 結構與資料庫權限重整。

## 保留的操作方式

- 教師建立 4 位數討論代碼、建立多個問題、指定作用中問題、查看回答及結束討論。
- 學生以討論代碼和暱稱加入、回答目前題目、等待下一題及離開討論。
- 教師端預設隱藏暱稱，可自行切換顯示。
- 同一組 4 位數代碼可在先前討論結束後再次使用。

## v4 安全架構

- 前端不再直接讀寫 `TblP02...` 資料表，只能呼叫 P02 RPC。
- 教師操作由資料庫驗證 `teacher_token`。
- 學生操作由資料庫驗證新增的 `participant_token`。
- `anon` 與 `authenticated` 沒有四個 P02 資料表的直接權限。
- RLS 與 restrictive policy 只套用到 P02 自己的資料表。
- 權杖不再出現在網址，並只保留於目前分頁的 `sessionStorage`。
- Supabase Auth 不持久化，並使用 P02 專屬 `storageKey`。

## 升級順序

1. 備份目前 Supabase 資料庫。
2. 依照 `Database/README.md` 的順序，逐一執行 SQL。
3. 確認 `99_P02_HealthCheck.sql` 每一列都是 `true`。
4. 編輯 `assets/js/config.js`，填入目前使用的 `SUPABASE_URL` 與 `SUPABASE_ANON_KEY`。
5. 將本版前端檔案部署到原 GitHub Pages repository。
6. 以一個教師瀏覽器及一個學生瀏覽器完整測試：建立討論、加入、出題、作答、看答案、結束討論。

資料庫必須先升級，再部署 v4 前端。升級不刪除既有資料；但是已停留在 v3 頁面的學生需要重新加入，才能取得新的參與權杖。

## 頁面

- `teacher-entry.html`：教師入口
- `teacher-questions.html`：問題管理
- `teacher-answers.html`：回答列表
- `student-entry.html`：學生入口
- `student-input.html`：學生回答
- `student-waiting.html`：學生等待
- `index.html`：角色選擇

## P-SDS 檔案

- `Database/00_Preflight.sql`
- `Database/01_CreateTables.sql`
- `Database/02_CreateIndexes.sql`
- `Database/03_CreateViews.sql`
- `Database/04_CreateFunctions.sql`
- `Database/05_EnableRLS.sql`
- `Database/06_CreatePolicies.sql`
- `Database/07_GrantPermissions.sql`
- `Database/90_P02_Permissions.sql`
- `Database/99_P02_HealthCheck.sql`
- `docs/SECURITY_AUDIT.md`
