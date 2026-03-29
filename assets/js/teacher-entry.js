import { createDiscussion } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, setMessage, clearMessage, goTo, buildUrl, saveStorage } from './utils.js';

const btnCreateDiscussion = qs('#btnCreateDiscussion');
const createMessage = qs('#createMessage');

btnCreateDiscussion?.addEventListener('click', async () => {
  clearMessage(createMessage);
  btnCreateDiscussion.disabled = true;

  try {
    const discussion = await createDiscussion();

    saveStorage(APP_CONFIG.STORAGE_KEYS.teacherDiscussionId, discussion.id);
    saveStorage(APP_CONFIG.STORAGE_KEYS.teacherToken, discussion.teacher_token);
    saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, discussion.join_code);

    const target = buildUrl('./teacher-questions.html', {
      discussion_id: discussion.id,
      token: discussion.teacher_token
    });
    goTo(target);
  } catch (error) {
    setMessage(createMessage, error.message || '建立討論失敗。', 'danger');
  } finally {
    btnCreateDiscussion.disabled = false;
  }
});
