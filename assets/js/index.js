import { createDiscussion, getTeacherState } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, readStorage, saveStorage, setMessage, clearMessage, goTo, buildUrl } from './utils.js';

const btnCreateDiscussion = qs('#btnCreateDiscussion');
const createMessage = qs('#createMessage');
const activeCard = qs('#activeDiscussionCard');
const activeCode = qs('#activeDiscussionCode');
const btnResume = qs('#btnResumeDiscussion');

const storedDiscussionId = Number(readStorage(APP_CONFIG.STORAGE_KEYS.teacherDiscussionId));
const storedTeacherToken = readStorage(APP_CONFIG.STORAGE_KEYS.teacherToken);

function openFacilitatorDiscussion(id) {
  goTo(buildUrl('./teacher-questions.html', { discussion_id: id }));
}

async function checkActiveDiscussion() {
  if (!storedDiscussionId || !storedTeacherToken) return;
  try {
    const state = await getTeacherState(storedDiscussionId, storedTeacherToken);
    if (state && state.status === 'open') {
      activeCode.textContent = state.join_code || '----';
      activeCard.classList.remove('d-none');
      btnCreateDiscussion.disabled = true;
      btnCreateDiscussion.title = '請先返回並結束目前討論 / End the active discussion first';
      btnResume.addEventListener('click', () => openFacilitatorDiscussion(storedDiscussionId));
    } else {
      sessionStorage.removeItem(APP_CONFIG.STORAGE_KEYS.teacherDiscussionId);
      sessionStorage.removeItem(APP_CONFIG.STORAGE_KEYS.teacherToken);
      sessionStorage.removeItem(APP_CONFIG.STORAGE_KEYS.joinCode);
    }
  } catch (_) { /* stale session: simply keep the normal start screen */ }
}

btnCreateDiscussion?.addEventListener('click', async () => {
  clearMessage(createMessage);
  btnCreateDiscussion.disabled = true;
  try {
    const discussion = await createDiscussion();
    saveStorage(APP_CONFIG.STORAGE_KEYS.teacherDiscussionId, discussion.id);
    saveStorage(APP_CONFIG.STORAGE_KEYS.teacherToken, discussion.teacher_token);
    saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, discussion.join_code);
    openFacilitatorDiscussion(discussion.id);
  } catch (error) {
    setMessage(createMessage, error.message || '建立討論失敗 / Failed to create discussion', 'danger');
  } finally { btnCreateDiscussion.disabled = false; }
});

checkActiveDiscussion();