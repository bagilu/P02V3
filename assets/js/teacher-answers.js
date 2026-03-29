import { getDiscussionById, getParticipantCount, getQuestionAnswersView } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, saveStorage, setMessage, formatDateTime, buildUrl, goTo } from './utils.js';

const discussionId = Number(getQueryParam('discussion_id'));
const questionId = Number(getQueryParam('question_id'));
const teacherToken = getQueryParam('token') || readStorage(APP_CONFIG.STORAGE_KEYS.teacherToken);

const discussionCodeEl = qs('#discussionCode');
const participantCountEl = qs('#participantCount');
const questionTextEl = qs('#questionText');
const answersTableBodyEl = qs('#answersTableBody');
const answersMessageEl = qs('#answersMessage');
const btnBackToQuestions = qs('#btnBackToQuestions');
const btnToggleNickname = qs('#btnToggleNickname');
const nicknameStatusTextEl = qs('#nicknameStatusText');

let showNickname = false;

if (!discussionId || !questionId) {
  alert('缺少必要參數，將回教師入口。');
  goTo('./teacher-entry.html');
}

btnBackToQuestions?.addEventListener('click', () => {
  const url = buildUrl('./teacher-questions.html', {
    discussion_id: discussionId,
    token: teacherToken
  });
  goTo(url);
});

btnToggleNickname?.addEventListener('click', () => {
  showNickname = !showNickname;
  saveStorage(APP_CONFIG.STORAGE_KEYS.showNickname, showNickname ? '1' : '0');
  updateNicknameUi();
  refreshAll().catch(() => {});
});

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

function renderRows(rows) {
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

async function refreshAll() {
  const [discussion, participantCount, view] = await Promise.all([
    getDiscussionById(discussionId),
    getParticipantCount(discussionId),
    getQuestionAnswersView(discussionId, questionId)
  ]);

  discussionCodeEl.textContent = discussion.join_code || '----';
  participantCountEl.textContent = participantCount;
  questionTextEl.textContent = view.question?.question_text || '查無問題';
  renderRows(view.rows || []);
}

showNickname = readStorage(APP_CONFIG.STORAGE_KEYS.showNickname) === '1';
updateNicknameUi();

refreshAll().catch(error => {
  setMessage(answersMessageEl, error.message || '載入回答列表失敗。', 'danger');
});

setInterval(() => {
  refreshAll().catch(() => {});
}, APP_CONFIG.POLLING_MS);
