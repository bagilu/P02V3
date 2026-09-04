import { getStudentState, leaveDiscussion, submitAnswer } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, readStorage, saveStorage, removeStorage, setMessage, clearMessage, buildUrl, goTo } from './utils.js';

const discussionId = Number(readStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId));
const participantId = Number(readStorage(APP_CONFIG.STORAGE_KEYS.participantId));
const participantToken = readStorage(APP_CONFIG.STORAGE_KEYS.participantToken);

const discussionCodeEl = qs('#discussionCode');
const participantCountEl = qs('#participantCount');
const activeQuestionTextEl = qs('#activeQuestionText');
const answerContentEl = qs('#answerContent');
const btnSubmitAnswer = qs('#btnSubmitAnswer');
const submitMessageEl = qs('#submitMessage');
const btnLeaveDiscussionTop = qs('#btnLeaveDiscussionTop');

let currentQuestionId = null;

if (!discussionId || !participantId || !participantToken) {
  alert('缺少學生端必要參數，將回學生入口。');
  goTo('./student-entry.html');
}

async function leaveAndGoHome() {
  try {
    await leaveDiscussion(discussionId, participantId, participantToken);
  } catch (_) {
    // ignore
  } finally {
    removeStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId);
    removeStorage(APP_CONFIG.STORAGE_KEYS.participantId);
    removeStorage(APP_CONFIG.STORAGE_KEYS.participantToken);
    removeStorage(APP_CONFIG.STORAGE_KEYS.nickname);
    goTo('./student-entry.html');
  }
}

btnLeaveDiscussionTop?.addEventListener('click', leaveAndGoHome);

async function refreshView() {
  clearMessage(submitMessageEl);
  const discussion = await getStudentState(discussionId, participantId, participantToken);

  discussionCodeEl.textContent = discussion.join_code || '----';
  participantCountEl.textContent = discussion.participant_count || 0;

  if (discussion.status !== 'open') {
    currentQuestionId = null;
    activeQuestionTextEl.textContent = '本討論已結束。';
    btnSubmitAnswer.disabled = true;
    setMessage(submitMessageEl, '教師已結束本次討論，無法再送出回答。', 'warning');
    return;
  }

  if (!discussion.active_question_id) {
    currentQuestionId = null;
    activeQuestionTextEl.textContent = '目前教師尚未設定作用中的問題，請稍候。';
    btnSubmitAnswer.disabled = true;
    return;
  }

  currentQuestionId = discussion.active_question_id;
  activeQuestionTextEl.textContent = discussion.active_question_text;
  btnSubmitAnswer.disabled = false;
  saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, discussion.join_code || '');
}

btnSubmitAnswer?.addEventListener('click', async () => {
  clearMessage(submitMessageEl);
  btnSubmitAnswer.disabled = true;

  try {
    const content = (answerContentEl.value || '').trim();

    if (!currentQuestionId) {
      throw new Error('目前尚未有作用中的問題。');
    }
    if (!content) {
      throw new Error('請先輸入回答內容。');
    }

    const saved = await submitAnswer(discussionId, currentQuestionId, participantId, participantToken, content);
    answerContentEl.value = '';

    const target = buildUrl('./student-waiting.html', { submitted_at: saved.submitted_at });
    goTo(target);
  } catch (error) {
    setMessage(submitMessageEl, error.message || '送出失敗。', 'danger');
    btnSubmitAnswer.disabled = false;
  }
});

refreshView().catch(error => {
  setMessage(submitMessageEl, error.message || '載入資料失敗。', 'danger');
});

setInterval(() => {
  refreshView().catch(() => {});
}, APP_CONFIG.POLLING_MS);
