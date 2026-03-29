# BrainStormingSystem v3

GitHub Pages + Supabase 的簡易腦力激盪系統。

## 使用前請先做的事

1. 在 Supabase 建立以下資料表：
   - TblP02Discussions
   - TblP02Questions
   - TblP02Participants
   - TblP02Answers

2. 編輯 `assets/js/config.js`，填入：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

3. 將整個資料夾內容上傳到 GitHub repository。

4. 到 GitHub Pages 啟用網站。

## 頁面說明

- `teacher-entry.html`：教師入口，發起新討論
- `student-entry.html`：學生入口，輸入代碼與暱稱加入討論
- `teacher-questions.html`：教師管理問題區
- `teacher-answers.html`：教師查看回答
- `student-input.html`：學生輸入回答
- `student-waiting.html`：學生等待畫面
- `index.html`：入口選擇頁

## 本版新增

- 教師入口與學生入口拆成兩個獨立頁面。
- 教師端回答列表預設隱藏學生暱稱。
- 教師可按下「顯示暱稱」按鈕，再切換為顯示或隱藏。
- 教師端問題區保留「結束討論」按鈕。
- 討論結束後，該討論會改為 `closed`，同一組 4 位數代碼未來可再次被新討論使用。

## 注意

目前前端假設您已經在 Supabase 中允許必要的讀寫權限。若之後要正式上線，建議再補：

- RLS
- 教師端權限保護
- Edge Function
- 更嚴格的資料驗證
