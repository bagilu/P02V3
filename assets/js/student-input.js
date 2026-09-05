import { getStudentState, joinDiscussion, resumeDiscussion, leaveDiscussion, submitAnswer } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, saveStorage, removeStorage, setMessage, clearMessage, buildUrl, goTo, sanitizeJoinCode } from './utils.js';
import { renderSharePanel } from './share.js';

let discussionId = Number(readStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId));
let participantId = Number(readStorage(APP_CONFIG.STORAGE_KEYS.participantId));
let participantToken = readStorage(APP_CONFIG.STORAGE_KEYS.participantToken);
const savedJoinCode = readStorage(APP_CONFIG.STORAGE_KEYS.joinCode) || '';
const requestedJoinCode = sanitizeJoinCode(getQueryParam('join') || '');

const joinPanel = qs('#joinPanel'), studentMain = qs('#studentMain'), directJoinCodeEl = qs('#directJoinCode');
const nicknameInput = qs('#nickname'), btnJoinDiscussion = qs('#btnJoinDiscussion'), joinMessageEl = qs('#joinMessage');
const discussionCodeEl = qs('#discussionCode'), participantCountEl = qs('#participantCount'), activeQuestionTextEl = qs('#activeQuestionText');
const answerContentEl = qs('#answerContent'), btnSubmitAnswer = qs('#btnSubmitAnswer'), submitMessageEl = qs('#submitMessage'), btnLeaveDiscussionTop = qs('#btnLeaveDiscussionTop');
const shareJoinCodeEl = qs('#shareJoinCode'), shareJoinUrlEl = qs('#shareJoinUrl'), joinQrCodeEl = qs('#joinQrCode'), btnCopyJoinUrl = qs('#btnCopyJoinUrl');
let currentQuestionId = null;

function clearStudentSession() {
  [APP_CONFIG.STORAGE_KEYS.studentDiscussionId, APP_CONFIG.STORAGE_KEYS.participantId, APP_CONFIG.STORAGE_KEYS.participantToken, APP_CONFIG.STORAGE_KEYS.nickname].forEach(removeStorage);
}

function showJoin(code) {
  studentMain.hidden = true; joinPanel.hidden = false; btnLeaveDiscussionTop.hidden = true;
  directJoinCodeEl.textContent = code || '----';
  nicknameInput.value = readStorage(APP_CONFIG.STORAGE_KEYS.nickname) || '';
}
function showMain() { joinPanel.hidden = true; studentMain.hidden = false; btnLeaveDiscussionTop.hidden = false; }

async function establishSession() {
  if (requestedJoinCode && requestedJoinCode.length !== 4) {
    showJoin('----'); setMessage(joinMessageEl, '加入網址中的討論代碼不正確。 / Invalid join code in the URL.', 'danger'); return false;
  }
  if (requestedJoinCode && savedJoinCode && requestedJoinCode !== savedJoinCode) {
    clearStudentSession(); discussionId = 0; participantId = 0; participantToken = null;
  }
  if (discussionId && participantId && participantToken && (!requestedJoinCode || requestedJoinCode === savedJoinCode)) {
    try {
      const resumed = await resumeDiscussion(discussionId, participantId, participantToken);
      saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, resumed.discussion.join_code);
      showMain(); return true;
    } catch (_) { clearStudentSession(); discussionId = 0; participantId = 0; participantToken = null; }
  }
  if (requestedJoinCode) { showJoin(requestedJoinCode); return false; }
  showJoin('----'); setMessage(joinMessageEl, '請使用教師提供的 QR Code 或加入網址。 / Please use the QR code or join URL provided by your teacher.', 'info');
  return false;
}

btnJoinDiscussion?.addEventListener('click', async () => {
  clearMessage(joinMessageEl); btnJoinDiscussion.disabled = true;
  try {
    if (requestedJoinCode.length !== 4) throw new Error('缺少正確的四位數討論代碼。 / A valid four-digit join code is required.');
    const nickname = (nicknameInput.value || '').trim();
    if (!nickname) throw new Error('請輸入暱稱。 / Please enter a nickname.');
    const result = await joinDiscussion(requestedJoinCode, nickname);
    discussionId = result.discussion.id; participantId = result.participant.id; participantToken = result.participant.participant_token;
    saveStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId, discussionId); saveStorage(APP_CONFIG.STORAGE_KEYS.participantId, participantId); saveStorage(APP_CONFIG.STORAGE_KEYS.participantToken, participantToken); saveStorage(APP_CONFIG.STORAGE_KEYS.nickname, result.participant.nickname); saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, result.discussion.join_code);
    showMain(); await refreshView();
  } catch (error) { setMessage(joinMessageEl, error.message || '加入討論失敗。 / Unable to join.', 'danger'); }
  finally { btnJoinDiscussion.disabled = false; }
});

async function leaveAndGoHome() {
  try { if (discussionId && participantId && participantToken) await leaveDiscussion(discussionId, participantId, participantToken); } catch (_) {}
  clearStudentSession(); removeStorage(APP_CONFIG.STORAGE_KEYS.joinCode); goTo('./index.html');
}
btnLeaveDiscussionTop?.addEventListener('click', leaveAndGoHome);

async function refreshView() {
  if (!discussionId || !participantId || !participantToken) return;
  clearMessage(submitMessageEl);
  const discussion = await getStudentState(discussionId, participantId, participantToken);
  discussionCodeEl.textContent = discussion.join_code || '----'; participantCountEl.textContent = discussion.participant_count || 0;
  saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, discussion.join_code || '');
  renderSharePanel({ joinCode: discussion.join_code, codeEl: shareJoinCodeEl, urlEl: shareJoinUrlEl, qrEl: joinQrCodeEl, copyButton: btnCopyJoinUrl });
  if (discussion.status !== 'open') { currentQuestionId = null; activeQuestionTextEl.textContent = '本討論已結束。 / This discussion has ended.'; btnSubmitAnswer.disabled = true; setMessage(submitMessageEl, '教師已結束本次討論。 / The teacher has ended this discussion.', 'warning'); return; }
  if (!discussion.active_question_id) { currentQuestionId = null; activeQuestionTextEl.textContent = '教師尚未設定問題，請稍候。 / Waiting for the teacher to set a question.'; btnSubmitAnswer.disabled = true; return; }
  currentQuestionId = discussion.active_question_id; activeQuestionTextEl.textContent = discussion.active_question_text; btnSubmitAnswer.disabled = false;
}

btnSubmitAnswer?.addEventListener('click', async () => {
  clearMessage(submitMessageEl); btnSubmitAnswer.disabled = true;
  try {
    const content = (answerContentEl.value || '').trim(); if (!currentQuestionId) throw new Error('目前尚未有作用中的問題。 / No active question yet.'); if (!content) throw new Error('請先輸入回答內容。 / Please enter a response.');
    const saved = await submitAnswer(discussionId, currentQuestionId, participantId, participantToken, content); answerContentEl.value = '';
    goTo(buildUrl('./student-waiting.html', { submitted_at: saved.submitted_at, join: readStorage(APP_CONFIG.STORAGE_KEYS.joinCode) || requestedJoinCode }));
  } catch (error) { setMessage(submitMessageEl, error.message || '送出失敗。 / Submit failed.', 'danger'); btnSubmitAnswer.disabled = false; }
});

establishSession().then(ok => { if (ok) refreshView().catch(e => setMessage(submitMessageEl, e.message || '載入資料失敗。 / Load failed.', 'danger')); });
setInterval(() => { if (!studentMain.hidden) refreshView().catch(() => {}); }, APP_CONFIG.POLLING_MS);
