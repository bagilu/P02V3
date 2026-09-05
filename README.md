# P02 BrainStormingSystem V5.1.1 — Shared Header & Student Flow

GitHub Pages + Supabase 的課堂腦力激盪系統。V5.1 以 **V5.0 Affinity Grouping** 為穩定基準，只調整前端入口流程與雙語介面，不修改資料庫 schema、RPC、既有回答或分類資料。

## V5.1.1 主要變更

- 首頁只保留教師入口，加入「慈濟大學 經營管理學系 好玩實驗室作品」品牌資訊與 Fun Lab 超連結。
- 教師發起討論後，在問題管理主畫面顯示四位數 Join Code、QR Code 與可分享網址。
- 學生不再經過獨立學生入口；使用 `student-input.html?join=NNNN` 直接進入學生主畫面。
- 第一次加入時，暱稱輸入直接出現在學生主畫面；成功後即可作答。
- 學生主畫面下方重複顯示相同 QR Code、四位數代碼與分享網址，可供下一位學生加入。
- 主要使用者介面採繁體中文／英文並列。
- `student-entry.html` 僅保留為舊網址相容提示頁，不再作為學生入口。
- 所有頁面頂端統一顯示「慈濟大學 經營管理學系 好玩實驗室作品」及英文副標題，Fun Lab 保留 P101 超連結。
- 學生送出回答後只提供「回到問題 / Back to Question」，不再提供「離開討論 / Leave」。
- 正式交付只提供 `assets/js/config-sample.js`；部署前請複製為 `assets/js/config.js` 並填入正式環境設定。


## V5.0 功能完整保留

- 教師建立四位數討論代碼、建立多個問題、指定作用中問題、查看回答及結束討論。
- 學生以暱稱加入、回答目前題目，送出後可回到目前問題等待下一題。
- 教師端可切換顯示／隱藏暱稱。
- 教師回答頁提供便利貼、表格、分類三種檢視。
- Affinity Grouping 支援建立、改名、刪除分類，拖曳或選單移動便利貼，並自動保存。
- 同一組四位數代碼可在先前討論結束後再次使用；同時開放中的討論代碼由 `UQ_P02_OpenJoinCode` 保證唯一。

## 安全架構

- 前端不直接讀寫 `TblP02...` 資料表，只能呼叫 P02 RPC。
- 教師操作由資料庫驗證 `teacher_token`。
- 學生操作由資料庫驗證 `participant_token`。
- `anon` 與 `authenticated` 沒有七個 P02 資料表的直接權限。
- RLS 與 restrictive policy 只套用 P02 專屬資料表。
- 權杖只保存在分頁層級 `sessionStorage`，不放在網址中。
- Supabase Auth 不持久化，使用 P02 專屬 storage key。

## 從 V5.0 / V5.1 升級到 V5.1.1

**不需要執行任何新的 SQL。** V5.0 已具備 `join_code`、`P02_CreateDiscussion`、`P02_JoinDiscussion` 與開放討論代碼唯一索引，因此直接部署 V5.1.1 前端即可。

建議部署順序：

1. 執行既有 `Database/99_P02_HealthCheck.sql`，確認全部為 `true`。
2. 將 `assets/js/config-sample.js` 複製為 `assets/js/config.js`，再填入目前正式環境的 `SUPABASE_URL` 與 `SUPABASE_ANON_KEY`。
3. 部署 V5.1.1 前端。
4. 使用一個教師瀏覽器與至少兩個學生裝置測試：建立討論 → 掃 QR Code／開啟分享網址 → 輸入暱稱 → 作答 → 分享給下一位學生 → 查看回答 → 結束討論。

## 頁面

- `index.html`：首頁，只提供教師入口。
- `teacher-entry.html`：教師發起討論。
- `teacher-questions.html`：教師主畫面、Join Code、QR Code、分享網址與問題管理。
- `teacher-answers.html`：回答列表、便利貼、表格與 Affinity Grouping。
- `student-input.html`：學生直接加入與回答主畫面。
- `student-waiting.html`：回答送出後等待畫面。
- `student-entry.html`：舊網址相容提示頁，不再是正式入口。

## P-SDS 檔案

- `Database/00_Preflight.sql`
- `Database/01_CreateTables.sql`
- `Database/02_CreateIndexes.sql`
- `Database/03_CreateViews.sql`
- `Database/04_CreateFunctions.sql`
- `Database/05_EnableRLS.sql`
- `Database/06_CreatePolicies.sql`
- `Database/07_GrantPermissions.sql`
- `Database/10_P02_V4.1_ActivationAndResume.sql`
- `Database/11_P02_V5.0_AffinityGrouping.sql`
- `Database/90_P02_Permissions.sql`
- `Database/99_P02_HealthCheck.sql`
- `docs/SECURITY_AUDIT.md`
