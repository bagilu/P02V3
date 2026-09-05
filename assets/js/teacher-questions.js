import { addQuestion, closeDiscussion, getQuestions, getTeacherState, setActiveQuestion } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, saveStorage, setMessage, clearMessage, buildUrl, goTo } from './utils.js';
import { renderSharePanel } from './share.js';

const discussionId = Number(getQueryParam('discussion_id') || readStorage(APP_CONFIG.STORAGE_KEYS.teacherDiscussionId));
const teacherToken = readStorage(APP_CONFIG.STORAGE_KEYS.teacherToken);

const discussionCodeEl = qs('#discussionCode');
const participantCountEl = qs('#participantCount');
const activeQuestionLabelEl = qs('#activeQuestionLabel');
const newQuestionTextEl = qs('#newQuestionText');
const btnAddQuestion = qs('#btnAddQuestion');
const questionMessageEl = qs('#questionMessage');
const questionListEl = qs('#questionList');
const btnCloseDiscussion = qs('#btnCloseDiscussion');
const shareJoinCodeEl = qs('#shareJoinCode');
const shareJoinUrlEl = qs('#shareJoinUrl');
const joinQrCodeEl = qs('#joinQrCode');
const btnCopyJoinUrl = qs('#btnCopyJoinUrl');

if (!discussionId || !teacherToken) {
  alert('缺少教師端必要參數，將回教師入口。');
  goTo('./teacher-entry.html');
}

async function loadHeader() {
  const discussion = await getTeacherState(discussionId, teacherToken);

  discussionCodeEl.textContent = discussion.join_code || '----';
  participantCountEl.textContent = discussion.participant_count || 0;
  activeQuestionLabelEl.textContent = discussion.active_question_text || '尚未設定 / Not set';

  renderSharePanel({ joinCode: discussion.join_code, codeEl: shareJoinCodeEl, urlEl: shareJoinUrlEl, qrEl: joinQrCodeEl, copyButton: btnCopyJoinUrl });

  saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, discussion.join_code || '');
}

function renderQuestionList(questions, activeQuestionId) {
  if (!questions.length) {
    questionListEl.innerHTML = '<div class="text-muted">目前尚未建立任何問題。 / No questions yet.</div>';
    return;
  }

  questionListEl.innerHTML = questions.map(q => {
    const isActive = Number(activeQuestionId) === Number(q.id);
    const answerUrl = buildUrl('./teacher-answers.html', {
      discussion_id: q.discussion_id,
      question_id: q.id
    });

    return `
      <div class="list-group-item question-item">
        <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div class="d-flex align-items-start gap-3 flex-grow-1">
            <div class="flex-grow-1">
              <div class="fw-semibold mb-1">問題 / Question ${q.sort_order} ${isActive ? '<span class="badge text-bg-success ms-2">目前題目 / Active</span>' : ''}</div>
              <div class="question-main">${escapeHtml(q.question_text)}</div>
            </div>
          </div>
          <div>
            <button type="button" class="btn btn-sm me-2 ${isActive ? 'btn-success' : 'btn-outline-success'} set-active-question-btn" data-question-id="${q.id}" ${isActive ? 'disabled' : ''}>
              ${isActive ? '目前題目 / Active' : '設為目前題目 / Set Active'}
            </button>
            <a href="${answerUrl}" class="btn btn-outline-primary btn-sm">查看回答 / Responses</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  questionListEl.querySelectorAll('.set-active-question-btn').forEach(button => {
    button.addEventListener('click', async (event) => {
      try {
        event.currentTarget.disabled = true;
        await setActiveQuestion(discussionId, teacherToken, Number(event.currentTarget.dataset.questionId));
        await refreshAll();
        setMessage(questionMessageEl, '目前題目已更新，學生端將自動顯示。 / Active question updated.', 'success');
      } catch (error) {
        setMessage(questionMessageEl, error.message || '設定作用中問題失敗。', 'danger');
        event.currentTarget.disabled = false;
      }
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function refreshAll() {
  clearMessage(questionMessageEl);
  const [discussion, questions] = await Promise.all([
    getTeacherState(discussionId, teacherToken),
    getQuestions(discussionId, teacherToken)
  ]);
  await loadHeader();
  renderQuestionList(questions, discussion.active_question_id);
}

btnCloseDiscussion?.addEventListener('click', async () => {
  clearMessage(questionMessageEl);

  const ok = window.confirm('確定要結束這個討論嗎？結束後學生將無法再加入或送出回答。 / End this discussion? Students will no longer be able to join or submit answers.');
  if (!ok) return;

  btnCloseDiscussion.disabled = true;

  try {
    await closeDiscussion(discussionId, teacherToken);
    alert('本次討論已結束。 / Discussion ended.');
    goTo('./teacher-entry.html');
  } catch (error) {
    setMessage(questionMessageEl, error.message || '結束討論失敗。', 'danger');
    btnCloseDiscussion.disabled = false;
  }
});

btnAddQuestion?.addEventListener('click', async () => {
  clearMessage(questionMessageEl);
  btnAddQuestion.disabled = true;

  try {
    const questionText = (newQuestionTextEl.value || '').trim();
    if (!questionText) {
      throw new Error('請先輸入問題內容。');
    }

    await addQuestion(discussionId, teacherToken, questionText);
    newQuestionTextEl.value = '';
    setMessage(questionMessageEl, '新問題已新增。', 'success');
    await refreshAll();
  } catch (error) {
    setMessage(questionMessageEl, error.message || '新增問題失敗。', 'danger');
  } finally {
    btnAddQuestion.disabled = false;
  }
});

refreshAll().catch(error => {
  setMessage(questionMessageEl, error.message || '載入資料失敗。', 'danger');
});

setInterval(() => {
  refreshAll().catch(() => {});
}, APP_CONFIG.POLLING_MS);
