import { leaveDiscussion } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, removeStorage, formatTime, setMessage, goTo } from './utils.js';

const discussionId = Number(readStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId));
const participantId = Number(readStorage(APP_CONFIG.STORAGE_KEYS.participantId));
const participantToken = readStorage(APP_CONFIG.STORAGE_KEYS.participantToken);
const submittedAt = getQueryParam('submitted_at');

const submittedTimeTextEl = qs('#submittedTimeText');
const waitingMessageEl = qs('#waitingMessage');
const btnNextAnswer = qs('#btnNextAnswer');
const btnLeaveDiscussion = qs('#btnLeaveDiscussion');

if (!discussionId || !participantId || !participantToken) {
  alert('缺少必要參數。 / Missing session information.');
  goTo('./index.html');
}

submittedTimeTextEl.textContent = submittedAt
  ? `您的回答已於 ${formatTime(submittedAt)} 送出。 / Submitted at ${formatTime(submittedAt)}.`
  : '您的回答已送出。 / Your response has been submitted.';

btnNextAnswer?.addEventListener('click', () => {
  const code = readStorage(APP_CONFIG.STORAGE_KEYS.joinCode) || getQueryParam('join');
  goTo(code ? `./student-input.html?join=${encodeURIComponent(code)}` : './student-input.html');
});

btnLeaveDiscussion?.addEventListener('click', async () => {
  try {
    await leaveDiscussion(discussionId, participantId, participantToken);
  } catch (error) {
    setMessage(waitingMessageEl, error.message || '離開討論失敗。', 'danger');
    return;
  }

  removeStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId);
  removeStorage(APP_CONFIG.STORAGE_KEYS.participantId);
  removeStorage(APP_CONFIG.STORAGE_KEYS.participantToken);
  removeStorage(APP_CONFIG.STORAGE_KEYS.nickname);
  removeStorage(APP_CONFIG.STORAGE_KEYS.joinCode);
  goTo('./index.html');
});
