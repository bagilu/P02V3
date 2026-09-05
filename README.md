# P02 BrainStormingSystem V5.2 — General Discussion UX

基準：V5.1.1 Shared Header & Student Flow。

## V5.2
- 首頁整合「發起新討論」，`teacher-entry.html` 僅保留舊連結相容轉址。
- 使用一般團體角色名稱：引導者 / Facilitator、參與者 / Participant。
- 引導者討論區只保留「結束討論」，不再顯示入口按鈕。
- 引導者可對目前問題提交或更新一則 Idea。
- 問題使用既有 `sort_order` 穩定顯示 Q1、Q2、Q3……，不另增問題編號欄位。
- Back / Refresh 防呆：首页可偵測同一分頁 `sessionStorage` 中尚未結束的引導者討論並提供 Resume。
- V5.0 的 Table / Sticky Note / Affinity Grouping 完整保留。

## Existing V5.1.1 upgrade
先執行：`Database/12_P02_V5.2_GeneralDiscussionUX.sql`
再執行：`Database/99_P02_HealthCheck.sql`，所有結果應為 `true`。
最後部署前端。

## Configuration
ZIP 僅提供 `assets/js/config-sample.js`。部署時請複製為 `assets/js/config.js` 並填入實際 Supabase 設定；不要將實際 `config.js` 提交至版本庫。

## P-SDS
所有 SQL 僅操作 `TblP02...` 與 `P02_...` 物件；不得使用 schema-wide GRANT/REVOKE、ALL TABLES IN SCHEMA 或 ALTER DEFAULT PRIVILEGES。前端維持 RPC-only。
