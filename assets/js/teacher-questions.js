import { addQuestion, closeDiscussion, getActiveQuestion, getDiscussionById, getParticipantCount, getQuestions, setActiveQuestion } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, saveStorage, setMessage, clearMessage, buildUrl, goTo } from './utils.js';

const discussionId = Number(getQueryParam('discussion_id') || readStorage(APP_CONFIG.STORAGE_KEYS.teacherDiscussionId));
const teacherToken = getQueryParam('token') || readStorage(APP_CONFIG.STORAGE_KEYS.teacherToken);

const discussionCodeEl = qs('#discussionCode');
const participantCountEl = qs('#participantCount');
const activeQuestionLabelEl = qs('#activeQuestionLabel');
const newQuestionTextEl = qs('#newQuestionText');
const btnAddQuestion = qs('#btnAddQuestion');
const questionMessageEl = qs('#questionMessage');
const questionListEl = qs('#questionList');
const btnCloseDiscussion = qs('#btnCloseDiscussion');

if (!discussionId || !teacherToken) {
  alert('缺少教師端必要參數，將回教師入口。');
  goTo('./teacher-entry.html');
}

async function loadHeader() {
  const [discussion, participantCount, activeQuestion] = await Promise.all([
    getDiscussionById(discussionId),
    getParticipantCount(discussionId),
    getActiveQuestion(discussionId)
  ]);

  discussionCodeEl.textContent = discussion.join_code || '----';
  participantCountEl.textContent = participantCount;
  activeQuestionLabelEl.textContent = activeQuestion ? activeQuestion.question_text : '尚未設定';

  saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode, discussion.join_code || '');
}

function renderQuestionList(questions, activeQuestionId) {
  if (!questions.length) {
    questionListEl.innerHTML = '<div class="text-muted">目前尚未建立任何問題。</div>';
    return;
  }

  questionListEl.innerHTML = questions.map(q => {
    const checked = Number(activeQuestionId) === Number(q.id) ? 'checked' : '';
    const answerUrl = buildUrl('./teacher-answers.html', {
      discussion_id: q.discussion_id,
      question_id: q.id,
      token: teacherToken
    });

    return `
      <div class="list-group-item question-item">
        <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div class="d-flex align-items-start gap-3 flex-grow-1">
            <div class="pt-1">
              <input class="form-check-input active-question-radio" type="radio" name="activeQuestion" value="${q.id}" ${checked}>
            </div>
            <div class="flex-grow-1">
              <div class="fw-semibold mb-1">問題 ${q.sort_order}</div>
              <div class="question-main">${escapeHtml(q.question_text)}</div>
            </div>
          </div>
          <div>
            <a href="${answerUrl}" class="btn btn-outline-primary btn-sm">查看回答</a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  questionListEl.querySelectorAll('.active-question-radio').forEach(radio => {
    radio.addEventListener('change', async (event) => {
      try {
        await setActiveQuestion(discussionId, teacherToken, Number(event.target.value));
        await refreshAll();
      } catch (error) {
        setMessage(questionMessageEl, error.message || '設定作用中問題失敗。', 'danger');
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
    getDiscussionById(discussionId),
    getQuestions(discussionId)
  ]);
  await loadHeader();
  renderQuestionList(questions, discussion.active_question_id);
}

btnCloseDiscussion?.addEventListener('click', async () => {
  clearMessage(questionMessageEl);

  const ok = window.confirm('確定要結束這個討論嗎？結束後學生將無法再加入或送出回答。');
  if (!ok) return;

  btnCloseDiscussion.disabled = true;

  try {
    await closeDiscussion(discussionId, teacherToken);
    alert('本次討論已結束。');
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
