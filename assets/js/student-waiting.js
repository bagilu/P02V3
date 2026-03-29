import { leaveDiscussion } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, removeStorage, formatTime, setMessage, buildUrl, goTo } from './utils.js';

const discussionId = Number(getQueryParam('discussion_id') || readStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId));
const participantId = Number(getQueryParam('participant_id') || readStorage(APP_CONFIG.STORAGE_KEYS.participantId));
const submittedAt = getQueryParam('submitted_at');

const submittedTimeTextEl = qs('#submittedTimeText');
const waitingMessageEl = qs('#waitingMessage');
const btnNextAnswer = qs('#btnNextAnswer');
const btnLeaveDiscussion = qs('#btnLeaveDiscussion');

if (!discussionId || !participantId) {
  alert('缺少必要參數，將回學生入口。');
  goTo('./student-entry.html');
}

submittedTimeTextEl.textContent = submittedAt
  ? `您的回答已於 ${formatTime(submittedAt)} 送出。`
  : '您的回答已送出。';

btnNextAnswer?.addEventListener('click', () => {
  const target = buildUrl('./student-input.html', {
    discussion_id: discussionId,
    participant_id: participantId
  });
  goTo(target);
});

btnLeaveDiscussion?.addEventListener('click', async () => {
  try {
    await leaveDiscussion(participantId);
  } catch (error) {
    setMessage(waitingMessageEl, error.message || '離開討論失敗。', 'danger');
    return;
  }

  removeStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId);
  removeStorage(APP_CONFIG.STORAGE_KEYS.participantId);
  removeStorage(APP_CONFIG.STORAGE_KEYS.nickname);
  goTo('./student-entry.html');
});
