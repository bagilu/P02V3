import { getActiveQuestion, getDiscussionById, getParticipantCount, leaveDiscussion, submitAnswer } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, saveStorage, removeStorage, setMessage, clearMessage, buildUrl, goTo } from './utils.js';

const discussionId = Number(getQueryParam('discussion_id') || readStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId));
const participantId = Number(getQueryParam('participant_id') || readStorage(APP_CONFIG.STORAGE_KEYS.participantId));

const discussionCodeEl = qs('#discussionCode');
const participantCountEl = qs('#participantCount');
const activeQuestionTextEl = qs('#activeQuestionText');
const answerContentEl = qs('#answerContent');
const btnSubmitAnswer = qs('#btnSubmitAnswer');
const submitMessageEl = qs('#submitMessage');
const btnLeaveDiscussionTop = qs('#btnLeaveDiscussionTop');

let currentQuestionId = null;

if (!discussionId || !participantId) {
  alert('缺少學生端必要參數，將回學生入口。');
  goTo('./student-entry.html');
}

async function leaveAndGoHome() {
  try {
    await leaveDiscussion(participantId);
  } catch (_) {
    // ignore
  } finally {
    removeStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId);
    removeStorage(APP_CONFIG.STORAGE_KEYS.participantId);
    removeStorage(APP_CONFIG.STORAGE_KEYS.nickname);
    goTo('./student-entry.html');
  }
}

btnLeaveDiscussionTop?.addEventListener('click', leaveAndGoHome);

async function refreshView() {
  clearMessage(submitMessageEl);
  const [discussion, participantCount, activeQuestion] = await Promise.all([
    getDiscussionById(discussionId),
    getParticipantCount(discussionId),
    getActiveQuestion(discussionId)
  ]);

  discussionCodeEl.textContent = discussion.join_code || '----';
  participantCountEl.textContent = participantCount;

  if (discussion.status !== 'open') {
    currentQuestionId = null;
    activeQuestionTextEl.textContent = '本討論已結束。';
    btnSubmitAnswer.disabled = true;
    setMessage(submitMessageEl, '教師已結束本次討論，無法再送出回答。', 'warning');
    return;
  }

  if (!activeQuestion) {
    currentQuestionId = null;
    activeQuestionTextEl.textContent = '目前教師尚未設定作用中的問題，請稍候。';
    btnSubmitAnswer.disabled = true;
    return;
  }

  currentQuestionId = activeQuestion.id;
  activeQuestionTextEl.textContent = activeQuestion.question_text;
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

    const saved = await submitAnswer(discussionId, currentQuestionId, participantId, content);
    answerContentEl.value = '';

    const target = buildUrl('./student-waiting.html', {
      discussion_id: discussionId,
      participant_id: participantId,
      submitted_at: saved.submitted_at
    });
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
