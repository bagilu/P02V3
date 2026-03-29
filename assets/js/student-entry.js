import { joinDiscussion } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, setMessage, clearMessage, sanitizeJoinCode, goTo, buildUrl, saveStorage } from './utils.js';

const btnJoinDiscussion = qs('#btnJoinDiscussion');
const joinCodeInput = qs('#joinCode');
const nicknameInput = qs('#nickname');
const joinMessage = qs('#joinMessage');

joinCodeInput?.addEventListener('input', (e) => {
  e.target.value = sanitizeJoinCode(e.target.value);
});

btnJoinDiscussion?.addEventListener('click', async () => {
  clearMessage(joinMessage);
  btnJoinDiscussion.disabled = true;

  try {
    const joinCode = sanitizeJoinCode(joinCodeInput.value);
    const nickname = (nicknameInput.value || '').trim();

    if (joinCode.length !== 4) {
      throw new Error('請輸入正確的 4 位數討論區編號。');
    }
    if (!nickname) {
      throw new Error('請輸入暱稱。');
    }

    const result = await joinDiscussion(joinCode, nickname);

    saveStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId, result.discussion.id);
    saveStorage(APP_CONFIG.STORAGE_KEYS.participantId, result.participant.id);
    saveStorage(APP_CONFIG.STORAGE_KEYS.nickname, result.participant.nickname);
    saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, result.discussion.join_code);

    const target = buildUrl('./student-input.html', {
      discussion_id: result.discussion.id,
      participant_id: result.participant.id
    });
    goTo(target);
  } catch (error) {
    setMessage(joinMessage, error.message || '加入討論失敗。', 'danger');
  } finally {
    btnJoinDiscussion.disabled = false;
  }
});
