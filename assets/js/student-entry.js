import { joinDiscussion, resumeDiscussion } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, setMessage, clearMessage, sanitizeJoinCode, goTo, saveStorage, readStorage } from './utils.js';

const btnJoinDiscussion = qs('#btnJoinDiscussion');
const joinCodeInput = qs('#joinCode');
const nicknameInput = qs('#nickname');
const joinMessage = qs('#joinMessage');

const savedDiscussionId = Number(readStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId));
const savedParticipantId = Number(readStorage(APP_CONFIG.STORAGE_KEYS.participantId));
const savedParticipantToken = readStorage(APP_CONFIG.STORAGE_KEYS.participantToken);
const savedJoinCode = readStorage(APP_CONFIG.STORAGE_KEYS.joinCode) || '';
const savedNickname = readStorage(APP_CONFIG.STORAGE_KEYS.nickname) || '';

if (savedDiscussionId && savedParticipantId && savedParticipantToken && savedJoinCode && savedNickname) {
  joinCodeInput.value = savedJoinCode;
  nicknameInput.value = savedNickname;
  setMessage(joinMessage, '偵測到本分頁尚有進行中的討論；按「加入討論」即可繼續。', 'info');
}

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

    const canResume = savedDiscussionId && savedParticipantId && savedParticipantToken
      && joinCode === savedJoinCode
      && nickname.toLocaleLowerCase() === savedNickname.toLocaleLowerCase();

    let result;
    if (canResume) {
      try {
        result = await resumeDiscussion(savedDiscussionId, savedParticipantId, savedParticipantToken);
      } catch (_) {
        // The old session may have ended while its 4-digit code was later reused.
        result = await joinDiscussion(joinCode, nickname);
      }
    } else {
      result = await joinDiscussion(joinCode, nickname);
    }

    saveStorage(APP_CONFIG.STORAGE_KEYS.studentDiscussionId, result.discussion.id);
    saveStorage(APP_CONFIG.STORAGE_KEYS.participantId, result.participant.id);
    saveStorage(APP_CONFIG.STORAGE_KEYS.participantToken, result.participant.participant_token);
    saveStorage(APP_CONFIG.STORAGE_KEYS.nickname, result.participant.nickname);
    saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, result.discussion.join_code);

    goTo('./student-input.html');
  } catch (error) {
    setMessage(joinMessage, error.message || '加入討論失敗。', 'danger');
  } finally {
    btnJoinDiscussion.disabled = false;
  }
});
