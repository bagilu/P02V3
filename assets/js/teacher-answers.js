import {
  createAffinityCategory,
  deleteAffinityCategory,
  getAffinityBoard,
  getQuestionAnswersView,
  getTeacherState,
  getQuestions,
  moveAffinityAnswer,
  renameAffinityCategory
} from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, saveStorage, setMessage, formatDateTime, formatTime, buildUrl, goTo } from './utils.js';

const discussionId = Number(getQueryParam('discussion_id'));
const questionId = Number(getQueryParam('question_id'));
const teacherToken = readStorage(APP_CONFIG.STORAGE_KEYS.teacherToken);

const discussionCodeEl = qs('#discussionCode');
const participantCountEl = qs('#participantCount');
const questionTextEl = qs('#questionText');
const answersTableBodyEl = qs('#answersTableBody');
const answersMessageEl = qs('#answersMessage');
const btnBackToQuestions = qs('#btnBackToQuestions');
const btnToggleNickname = qs('#btnToggleNickname');
const nicknameStatusTextEl = qs('#nicknameStatusText');
const answerCountTextEl = qs('#answerCountText');
const btnStickyView = qs('#btnStickyView');
const btnTableView = qs('#btnTableView');
const btnAffinityView = qs('#btnAffinityView');
const stickyViewEl = qs('#stickyView');
const tableViewEl = qs('#tableView');
const affinityViewEl = qs('#affinityView');
const stickyNotesGridEl = qs('#stickyNotesGrid');
const affinityBoardEl = qs('#affinityBoard');
const affinitySaveStatusEl = qs('#affinitySaveStatus');
const btnAddCategory = qs('#btnAddCategory');
const btnRefreshAffinity = qs('#btnRefreshAffinity');

let showNickname = false;
let answerView = 'sticky';
let affinityState = null;
let draggedAnswerId = null;
const ANSWER_VIEW_STORAGE_KEY = 'p02_teacher_answer_view';

if (!discussionId || !questionId || !teacherToken) {
  alert('缺少必要參數，將回首頁。');
  goTo('./index.html');
}

btnBackToQuestions?.addEventListener('click', () => {
  goTo(buildUrl('./teacher-questions.html', { discussion_id: discussionId }));
});

btnToggleNickname?.addEventListener('click', () => {
  showNickname = !showNickname;
  saveStorage(APP_CONFIG.STORAGE_KEYS.showNickname, showNickname ? '1' : '0');
  updateNicknameUi();
  if (affinityState) renderAffinityBoard();
  refreshAll().catch(() => {});
});

btnStickyView?.addEventListener('click', () => setAnswerView('sticky'));
btnTableView?.addEventListener('click', () => setAnswerView('table'));
btnAffinityView?.addEventListener('click', () => setAnswerView('affinity'));
btnRefreshAffinity?.addEventListener('click', () => loadAffinityBoard());

btnAddCategory?.addEventListener('click', async () => {
  const name = window.prompt('請輸入新的分類名稱 / New group name:');
  if (name === null || !name.trim()) return;
  try {
    setAffinityStatus('正在新增分類…');
    await createAffinityCategory(discussionId, questionId, teacherToken, name.trim());
    await loadAffinityBoard('分類已新增並保存。');
  } catch (error) {
    setAffinityStatus(error.message || '新增分類失敗。', true);
  }
});

function readAnswerViewPreference() {
  try {
    const saved = localStorage.getItem(ANSWER_VIEW_STORAGE_KEY);
    return ['sticky', 'table', 'affinity'].includes(saved) ? saved : 'sticky';
  } catch (_) {
    return 'sticky';
  }
}

function setAnswerView(view, persist = true) {
  answerView = ['sticky', 'table', 'affinity'].includes(view) ? view : 'sticky';
  const buttons = [
    [btnStickyView, 'sticky'],
    [btnTableView, 'table'],
    [btnAffinityView, 'affinity']
  ];

  stickyViewEl.hidden = answerView !== 'sticky';
  tableViewEl.hidden = answerView !== 'table';
  affinityViewEl.hidden = answerView !== 'affinity';

  buttons.forEach(([button, value]) => {
    const selected = answerView === value;
    button.setAttribute('aria-pressed', String(selected));
    button.className = selected ? 'btn btn-primary' : 'btn btn-outline-secondary';
  });

  if (persist) {
    try {
      localStorage.setItem(ANSWER_VIEW_STORAGE_KEY, answerView);
    } catch (_) {
      // The view still works when browser storage is unavailable.
    }
  }

  if (answerView === 'affinity' && !affinityState) {
    loadAffinityBoard().catch(() => {});
  }
}

function updateNicknameUi() {
  btnToggleNickname.textContent = showNickname ? '隱藏暱稱 / Hide Names' : '顯示暱稱 / Show Names';
  nicknameStatusTextEl.textContent = showNickname ? '目前顯示暱稱 / Names shown' : '目前預設隱藏暱稱 / Names hidden by default';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function renderNickname(value) {
  return showNickname ? escapeHtml(value || '') : '<span class="text-muted">已隱藏</span>';
}

function renderTableRows(rows) {
  if (!rows.length) {
    answersTableBodyEl.innerHTML = '<tr><td colspan="3" class="text-center text-muted">目前尚無想法。 / No ideas yet.</td></tr>';
    return;
  }

  answersTableBodyEl.innerHTML = rows.map(row => `
    <tr>
      <td>${renderNickname(row.nickname || '')}</td>
      <td>${row.submitted_at ? formatDateTime(row.submitted_at) : ''}</td>
      <td class="answer-content-cell">${escapeHtml(row.content || '')}</td>
    </tr>
  `).join('');
}

function stickyColorClass(participantId) {
  const colors = ['sticky-note-yellow', 'sticky-note-blue', 'sticky-note-pink', 'sticky-note-green'];
  const hash = [...String(participantId || '0')].reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function renderStickyNotes(rows) {
  const answeredRows = rows.filter(row => row.submitted_at && row.content);
  if (!answeredRows.length) {
    stickyNotesGridEl.innerHTML = '<div class="sticky-empty-state">目前尚無參與者送出想法。 / No participant ideas yet.</div>';
    return;
  }

  stickyNotesGridEl.innerHTML = answeredRows.map(row => `
    <article class="sticky-note-item ${stickyColorClass(row.participant_id)}">
      <p class="sticky-note-content">${escapeHtml(row.content || '')}</p>
      <footer class="sticky-note-footer">
        <span>${showNickname ? escapeHtml(row.nickname || '') : '匿名'}</span>
        <time>${formatTime(row.submitted_at)}</time>
      </footer>
    </article>
  `).join('');
}

function renderAnswers(rows) {
  const answeredCount = rows.filter(row => row.submitted_at && row.content).length;
  const participantCount = rows.filter(row => row.nickname !== '引導者 / Facilitator').length;
  answerCountTextEl.textContent = `想法 ${answeredCount} · 參與者 ${participantCount} / Ideas ${answeredCount} · Participants ${participantCount}`;
  renderTableRows(rows);
  renderStickyNotes(rows);
}

function setAffinityStatus(message, isError = false) {
  affinitySaveStatusEl.textContent = message;
  affinitySaveStatusEl.className = isError ? 'text-danger' : 'text-muted';
}

function categoryOptions(selectedCategoryId) {
  const categories = affinityState?.categories || [];
  const unassignedSelected = selectedCategoryId === null ? 'selected' : '';
  return `
    <option value="" ${unassignedSelected}>尚未分類</option>
    ${categories.map(category => {
      const selected = Number(category.id) === Number(selectedCategoryId) ? 'selected' : '';
      return `<option value="${category.id}" ${selected}>${escapeHtml(category.name)}</option>`;
    }).join('')}
  `;
}

function notesForCategory(categoryId) {
  return (affinityState?.notes || []).filter(note => {
    if (categoryId === null) return note.category_id === null;
    return Number(note.category_id) === Number(categoryId);
  });
}

function renderAffinityNote(note) {
  return `
    <article class="affinity-note" draggable="true" data-answer-id="${note.answer_id}">
      <div class="affinity-note-content">${escapeHtml(note.content || '')}</div>
      <div class="affinity-note-meta">
        <span>${showNickname ? escapeHtml(note.nickname || '') : '匿名'}</span>
        <time>${formatTime(note.submitted_at)}</time>
      </div>
      <label class="visually-hidden" for="moveAnswer${note.answer_id}">移動這張便利貼</label>
      <select id="moveAnswer${note.answer_id}" class="form-select form-select-sm affinity-move-select" data-answer-id="${note.answer_id}">
        ${categoryOptions(note.category_id)}
      </select>
    </article>
  `;
}

function renderAffinityColumn(category) {
  const categoryId = category.id === null ? null : Number(category.id);
  const notes = notesForCategory(categoryId);
  const colorClass = categoryId === null ? '' : `affinity-column-color-${Number(category.color_key) || 0}`;
  const actions = categoryId === null ? '' : `
    <div class="affinity-column-actions">
      <button type="button" class="btn btn-outline-secondary affinity-rename-category" data-category-id="${categoryId}">改名</button>
      <button type="button" class="btn btn-outline-danger affinity-delete-category" data-category-id="${categoryId}">刪除</button>
    </div>
  `;
  return `
    <section class="affinity-column ${colorClass}" data-category-id="${categoryId ?? ''}">
      <header class="affinity-column-header">
        <div>
          <h3 class="affinity-column-title">${escapeHtml(category.name)}</h3>
          <div class="affinity-column-count">${notes.length} 張便利貼</div>
        </div>
        ${actions}
      </header>
      <div class="affinity-drop-zone">
        ${notes.length ? notes.map(renderAffinityNote).join('') : '<div class="affinity-empty">將便利貼拖曳到這裡</div>'}
      </div>
    </section>
  `;
}

function renderAffinityBoard() {
  if (!affinityState) {
    affinityBoardEl.innerHTML = '<div class="affinity-empty">正在載入分類看板…</div>';
    return;
  }

  const columns = [
    { id: null, name: '尚未分類 / Uncategorized', color_key: 0 },
    ...(affinityState.categories || [])
  ];
  affinityBoardEl.innerHTML = columns.map(renderAffinityColumn).join('');
  bindAffinityInteractions();
}

function bindAffinityInteractions() {
  affinityBoardEl.querySelectorAll('.affinity-note').forEach(note => {
    note.addEventListener('dragstart', event => {
      draggedAnswerId = Number(event.currentTarget.dataset.answerId);
      event.currentTarget.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(draggedAnswerId));
    });
    note.addEventListener('dragend', event => {
      event.currentTarget.classList.remove('is-dragging');
      affinityBoardEl.querySelectorAll('.is-drag-over').forEach(column => column.classList.remove('is-drag-over'));
      draggedAnswerId = null;
    });
  });

  affinityBoardEl.querySelectorAll('.affinity-column').forEach(column => {
    column.addEventListener('dragover', event => {
      event.preventDefault();
      column.classList.add('is-drag-over');
    });
    column.addEventListener('dragleave', () => column.classList.remove('is-drag-over'));
    column.addEventListener('drop', event => {
      event.preventDefault();
      column.classList.remove('is-drag-over');
      const answerId = draggedAnswerId || Number(event.dataTransfer.getData('text/plain'));
      const categoryId = column.dataset.categoryId ? Number(column.dataset.categoryId) : null;
      if (answerId) moveNote(answerId, categoryId);
    });
  });

  affinityBoardEl.querySelectorAll('.affinity-move-select').forEach(select => {
    select.addEventListener('change', event => {
      const categoryId = event.currentTarget.value ? Number(event.currentTarget.value) : null;
      moveNote(Number(event.currentTarget.dataset.answerId), categoryId);
    });
  });

  affinityBoardEl.querySelectorAll('.affinity-rename-category').forEach(button => {
    button.addEventListener('click', () => renameCategory(Number(button.dataset.categoryId)));
  });
  affinityBoardEl.querySelectorAll('.affinity-delete-category').forEach(button => {
    button.addEventListener('click', () => deleteCategory(Number(button.dataset.categoryId)));
  });
}

async function loadAffinityBoard(successMessage = '') {
  try {
    btnRefreshAffinity.disabled = true;
    setAffinityStatus('正在載入分類看板…');
    affinityState = await getAffinityBoard(discussionId, questionId, teacherToken);
    renderAffinityBoard();
    setAffinityStatus(successMessage || '分類結果已同步。');
  } catch (error) {
    setAffinityStatus(error.message || '讀取分類看板失敗。', true);
    throw error;
  } finally {
    btnRefreshAffinity.disabled = false;
  }
}

async function moveNote(answerId, categoryId) {
  try {
    setAffinityStatus('正在保存移動結果…');
    await moveAffinityAnswer(discussionId, questionId, teacherToken, answerId, categoryId);
    await loadAffinityBoard('移動結果已保存。');
  } catch (error) {
    setAffinityStatus(error.message || '移動便利貼失敗。', true);
  }
}

async function renameCategory(categoryId) {
  const category = (affinityState?.categories || []).find(item => Number(item.id) === categoryId);
  if (!category) return;
  const name = window.prompt('請輸入新的分類名稱 / New group name:', category.name);
  if (name === null || !name.trim() || name.trim() === category.name) return;
  try {
    setAffinityStatus('正在修改分類名稱…');
    await renameAffinityCategory(discussionId, questionId, teacherToken, categoryId, name.trim());
    await loadAffinityBoard('分類名稱已保存。');
  } catch (error) {
    setAffinityStatus(error.message || '修改分類名稱失敗。', true);
  }
}

async function deleteCategory(categoryId) {
  const category = (affinityState?.categories || []).find(item => Number(item.id) === categoryId);
  if (!category) return;
  const confirmed = window.confirm(`確定刪除「${category.name}」嗎？其中的便利貼會回到「尚未分類」。`);
  if (!confirmed) return;
  try {
    setAffinityStatus('正在刪除分類…');
    await deleteAffinityCategory(discussionId, questionId, teacherToken, categoryId);
    await loadAffinityBoard('分類已刪除；原便利貼已移回尚未分類。');
  } catch (error) {
    setAffinityStatus(error.message || '刪除分類失敗。', true);
  }
}

async function refreshAll() {
  const [discussion, view, questions] = await Promise.all([
    getTeacherState(discussionId, teacherToken),
    getQuestionAnswersView(discussionId, questionId, teacherToken),
    getQuestions(discussionId, teacherToken)
  ]);

  discussionCodeEl.textContent = discussion.join_code || '----';
  participantCountEl.textContent = discussion.participant_count || 0;
  const q = questions.find(item => Number(item.id) === Number(questionId));
  questionTextEl.textContent = `Q${q?.sort_order || ''} ${view.question?.question_text || '查無問題'}`;
  const visibleRows = (view.rows || []).filter(row => !(row.nickname === '引導者 / Facilitator' && !row.submitted_at && !row.content));
  renderAnswers(visibleRows);
}

showNickname = readStorage(APP_CONFIG.STORAGE_KEYS.showNickname) === '1';
answerView = readAnswerViewPreference();
updateNicknameUi();
setAnswerView(answerView, false);

refreshAll().catch(error => {
  setMessage(answersMessageEl, error.message || '載入回答列表失敗。', 'danger');
});

setInterval(() => {
  refreshAll().catch(() => {});
}, APP_CONFIG.POLLING_MS);
