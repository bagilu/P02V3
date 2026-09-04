import { getQuestionAnswersView, getTeacherState } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, saveStorage, setMessage, formatDateTime, formatTime, buildUrl, goTo } from './utils.js';

const discussionId = Number(getQueryParam('discussion_id'));
const questionId = Number(getQueryParam('question_id'));
const teacherToken = readStorage(APP_CONFIG.STORAGE_KEYS.teacherToken);

const discussionCodeEl = qs('#discussionCode');
const participantCountEl = qs('#participantCount');
const questionTextEl = qs('#questionText');
const answersTableBodyEl = qs('#answersTableBody');
const answersMessageEl = qs('#answersMessage');
const btnBackToQuestions = qs('#btnBackToQuestions');
const btnToggleNickname = qs('#btnToggleNickname');
const nicknameStatusTextEl = qs('#nicknameStatusText');
const answerCountTextEl = qs('#answerCountText');
const btnStickyView = qs('#btnStickyView');
const btnTableView = qs('#btnTableView');
const stickyViewEl = qs('#stickyView');
const tableViewEl = qs('#tableView');
const stickyNotesGridEl = qs('#stickyNotesGrid');

let showNickname = false;
let answerView = 'sticky';
const ANSWER_VIEW_STORAGE_KEY = 'p02_teacher_answer_view';

if (!discussionId || !questionId || !teacherToken) {
  alert('缺少必要參數，將回教師入口。');
  goTo('./teacher-entry.html');
}

btnBackToQuestions?.addEventListener('click', () => {
  const url = buildUrl('./teacher-questions.html', {
    discussion_id: discussionId
  });
  goTo(url);
});

btnToggleNickname?.addEventListener('click', () => {
  showNickname = !showNickname;
  saveStorage(APP_CONFIG.STORAGE_KEYS.showNickname, showNickname ? '1' : '0');
  updateNicknameUi();
  refreshAll().catch(() => {});
});

btnStickyView?.addEventListener('click', () => setAnswerView('sticky'));
btnTableView?.addEventListener('click', () => setAnswerView('table'));

function readAnswerViewPreference() {
  try {
    return localStorage.getItem(ANSWER_VIEW_STORAGE_KEY) === 'table' ? 'table' : 'sticky';
  } catch (_) {
    return 'sticky';
  }
}

function setAnswerView(view, persist = true) {
  answerView = view === 'table' ? 'table' : 'sticky';
  const showSticky = answerView === 'sticky';

  stickyViewEl.hidden = !showSticky;
  tableViewEl.hidden = showSticky;
  btnStickyView.setAttribute('aria-pressed', String(showSticky));
  btnTableView.setAttribute('aria-pressed', String(!showSticky));
  btnStickyView.className = showSticky ? 'btn btn-primary' : 'btn btn-outline-secondary';
  btnTableView.className = showSticky ? 'btn btn-outline-secondary' : 'btn btn-primary';

  if (persist) {
    try {
      localStorage.setItem(ANSWER_VIEW_STORAGE_KEY, answerView);
    } catch (_) {
      // The view still works when browser storage is unavailable.
    }
  }
}

function updateNicknameUi() {
  if (btnToggleNickname) {
    btnToggleNickname.textContent = showNickname ? '隱藏暱稱' : '顯示暱稱';
  }
  if (nicknameStatusTextEl) {
    nicknameStatusTextEl.textContent = showNickname ? '目前顯示暱稱' : '目前預設隱藏暱稱';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderNickname(value) {
  if (showNickname) return escapeHtml(value || '');
  return '<span class="text-muted">已隱藏</span>';
}

function renderTableRows(rows) {
  if (!rows.length) {
    answersTableBodyEl.innerHTML = '<tr><td colspan="3" class="text-center text-muted">目前尚無參與者。</td></tr>';
    return;
  }

  answersTableBodyEl.innerHTML = rows.map(row => `
    <tr>
      <td>${renderNickname(row.nickname || '')}</td>
      <td>${row.submitted_at ? formatDateTime(row.submitted_at) : ''}</td>
      <td class="answer-content-cell">${escapeHtml(row.content || '')}</td>
    </tr>
  `).join('');
}

function stickyColorClass(participantId) {
  const colors = ['sticky-note-yellow', 'sticky-note-blue', 'sticky-note-pink', 'sticky-note-green'];
  const source = String(participantId || '0');
  const hash = [...source].reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function renderStickyNotes(rows) {
  const answeredRows = rows.filter(row => row.submitted_at && row.content);
  if (!answeredRows.length) {
    stickyNotesGridEl.innerHTML = '<div class="sticky-empty-state">目前尚無學生送出回答。</div>';
    return;
  }

  stickyNotesGridEl.innerHTML = answeredRows.map(row => `
    <article class="sticky-note-item ${stickyColorClass(row.participant_id)}">
      <p class="sticky-note-content">${escapeHtml(row.content || '')}</p>
      <footer class="sticky-note-footer">
        <span>${showNickname ? escapeHtml(row.nickname || '') : '匿名'}</span>
        <time>${formatTime(row.submitted_at)}</time>
      </footer>
    </article>
  `).join('');
}

function renderAnswers(rows) {
  const answeredCount = rows.filter(row => row.submitted_at && row.content).length;
  answerCountTextEl.textContent = `已回答 ${answeredCount}／${rows.length}`;
  renderTableRows(rows);
  renderStickyNotes(rows);
}

async function refreshAll() {
  const [discussion, view] = await Promise.all([
    getTeacherState(discussionId, teacherToken),
    getQuestionAnswersView(discussionId, questionId, teacherToken)
  ]);

  discussionCodeEl.textContent = discussion.join_code || '----';
  participantCountEl.textContent = discussion.participant_count || 0;
  questionTextEl.textContent = view.question?.question_text || '查無問題';
  renderAnswers(view.rows || []);
}

showNickname = readStorage(APP_CONFIG.STORAGE_KEYS.showNickname) === '1';
answerView = readAnswerViewPreference();
updateNicknameUi();
setAnswerView(answerView, false);

refreshAll().catch(error => {
  setMessage(answersMessageEl, error.message || '載入回答列表失敗。', 'danger');
});

setInterval(() => {
  refreshAll().catch(() => {});
}, APP_CONFIG.POLLING_MS);
