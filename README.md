# P02 BrainStormingSystem V5.0 Affinity Grouping

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
- `anon` 與 `authenticated` 沒有七個 P02 資料表的直接權限。
- RLS 與 restrictive policy 只套用到 P02 自己的資料表。
- 權杖不再出現在網址，並只保留於目前分頁的 `sessionStorage`。
- Supabase Auth 不持久化，並使用 P02 專屬 `storageKey`。
- 第一題建立後會自動成為目前題目；教師也可用明確按鈕切換目前題目。
- 學生返回加入頁時，可用原分頁內的參與權杖安全續接同一討論。
- 教師回答頁可在便利貼、表格與分類看板三種檢視間切換，並記住上次選擇。
- 分類看板可新增、改名及刪除分類，並可拖曳便利貼到不同分類。
- 每次分類操作都立即保存到 Supabase；刪除分類時，其便利貼會安全回到「尚未分類」。
- 手機或不方便拖曳時，可用每張便利貼下方的選單移動分類。
- V5.0 新增三張 P02 專屬分類資料表及五個教師權杖驗證 RPC，不改動既有回答結構。

## 升級順序

1. 備份目前 Supabase 資料庫。
2. 既有 V4.2 資料庫只執行 `Database/11_P02_V5.0_AffinityGrouping.sql`；全新安裝則依照 `Database/README.md` 執行 `00` 至 `07`。
3. 確認 `99_P02_HealthCheck.sql` 每一列都是 `true`。
4. 編輯 `assets/js/config.js`，填入目前使用的 `SUPABASE_URL` 與 `SUPABASE_ANON_KEY`。
5. 將本版前端檔案部署到原 GitHub Pages repository。
6. 以一個教師瀏覽器及一個學生瀏覽器完整測試：建立討論、加入、出題、作答、看答案、結束討論。

資料庫必須先升級，再部署 V5.0 前端。V4.2 升級不修改或刪除既有討論、題目、參與者與回答。

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
- `Database/10_P02_V4.1_ActivationAndResume.sql`（僅供已安裝 V4.0 者升級）
- `Database/11_P02_V5.0_AffinityGrouping.sql`（僅供已安裝 V4.2 者升級）
- `Database/90_P02_Permissions.sql`
- `Database/99_P02_HealthCheck.sql`
- `docs/SECURITY_AUDIT.md`
