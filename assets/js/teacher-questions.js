import { addQuestion, closeDiscussion, getQuestions, getTeacherState, getQuestionAnswersView, setActiveQuestion, submitFacilitatorIdea } from './api.js';
import { APP_CONFIG } from './config.js';
import { qs, getQueryParam, readStorage, saveStorage, setMessage, clearMessage, buildUrl, goTo } from './utils.js';
import { renderSharePanel } from './share.js';

const discussionId = Number(getQueryParam('discussion_id') || readStorage(APP_CONFIG.STORAGE_KEYS.teacherDiscussionId));
const teacherToken = readStorage(APP_CONFIG.STORAGE_KEYS.teacherToken);
const discussionCodeEl=qs('#discussionCode'), participantCountEl=qs('#participantCount'), activeQuestionLabelEl=qs('#activeQuestionLabel');
const newQuestionTextEl=qs('#newQuestionText'), btnAddQuestion=qs('#btnAddQuestion'), questionMessageEl=qs('#questionMessage'), questionListEl=qs('#questionList'), btnCloseDiscussion=qs('#btnCloseDiscussion');
const shareJoinCodeEl=qs('#shareJoinCode'), shareJoinUrlEl=qs('#shareJoinUrl'), joinQrCodeEl=qs('#joinQrCode'), btnCopyJoinUrl=qs('#btnCopyJoinUrl');
const facilitatorIdeaCard=qs('#facilitatorIdeaCard'), facilitatorIdeaQuestion=qs('#facilitatorIdeaQuestion'), facilitatorIdeaText=qs('#facilitatorIdeaText'), btnSubmitFacilitatorIdea=qs('#btnSubmitFacilitatorIdea'), facilitatorIdeaMessage=qs('#facilitatorIdeaMessage');
let currentState=null;
let loadedFacilitatorIdeaQuestionId=null;
let facilitatorIdeaLoadSequence=0;

if (!discussionId || !teacherToken) { alert('找不到有效的引導者討論工作階段。 / No active facilitator session found.'); goTo('./index.html'); }

function escapeHtml(text){const d=document.createElement('div');d.textContent=text??'';return d.innerHTML;}
async function loadFacilitatorIdeaForQuestion(questionId){
  const requestedQuestionId=Number(questionId);
  const sequence=++facilitatorIdeaLoadSequence;
  clearMessage(facilitatorIdeaMessage);
  try{
    const view=await getQuestionAnswersView(discussionId,requestedQuestionId,teacherToken);
    if(sequence!==facilitatorIdeaLoadSequence || Number(currentState?.active_question_id)!==requestedQuestionId) return;
    const facilitatorRow=(view.rows||[]).find(row=>row.nickname==='引導者 / Facilitator');
    facilitatorIdeaText.value=facilitatorRow?.content||'';
    loadedFacilitatorIdeaQuestionId=requestedQuestionId;
  }catch(e){
    if(sequence!==facilitatorIdeaLoadSequence || Number(currentState?.active_question_id)!==requestedQuestionId) return;
    facilitatorIdeaText.value='';
    loadedFacilitatorIdeaQuestionId=requestedQuestionId;
    setMessage(facilitatorIdeaMessage,e.message||'讀取引導者想法失敗。 / Failed to load facilitator idea.','danger');
  }
}
function updateStateUi(state){
  currentState=state; discussionCodeEl.textContent=state.join_code||'----'; participantCountEl.textContent=state.participant_count||0;
  activeQuestionLabelEl.textContent=state.active_question_text||'尚未設定 / Not set';
  renderSharePanel({joinCode:state.join_code,codeEl:shareJoinCodeEl,urlEl:shareJoinUrlEl,qrEl:joinQrCodeEl,copyButton:btnCopyJoinUrl});
  saveStorage(APP_CONFIG.STORAGE_KEYS.joinCode,state.join_code||'');
  const hasActive=Boolean(state.active_question_id); facilitatorIdeaCard.classList.toggle('d-none',!hasActive);
  if(hasActive){
    facilitatorIdeaQuestion.innerHTML=`<strong>Q${state.active_question_sort_order || ''}</strong> ${escapeHtml(state.active_question_text||'')}`;
    if(Number(loadedFacilitatorIdeaQuestionId)!==Number(state.active_question_id)) loadFacilitatorIdeaForQuestion(state.active_question_id);
  }else{
    facilitatorIdeaLoadSequence++;
    loadedFacilitatorIdeaQuestionId=null;
    facilitatorIdeaText.value='';
    clearMessage(facilitatorIdeaMessage);
  }
}
function renderQuestionList(questions,activeId){
  if(!questions.length){questionListEl.innerHTML='<div class="text-muted">目前尚未建立任何問題。 / No questions yet.</div>';return;}
  questionListEl.innerHTML=questions.map(q=>{const active=Number(activeId)===Number(q.id);const answerUrl=buildUrl('./teacher-answers.html',{discussion_id:q.discussion_id,question_id:q.id});return `<div class="list-group-item question-item"><div class="d-flex justify-content-between align-items-start gap-3 flex-wrap"><div class="flex-grow-1"><div class="fw-semibold mb-1">Q${q.sort_order} ${active?'<span class="badge text-bg-success ms-2">目前問題 / Active</span>':''}</div><div class="question-main">${escapeHtml(q.question_text)}</div></div><div><button type="button" class="btn btn-sm me-2 ${active?'btn-success':'btn-outline-success'} set-active-question-btn" data-question-id="${q.id}" ${active?'disabled':''}>${active?'目前問題 / Active':'設為目前問題 / Set Active'}</button><a href="${answerUrl}" class="btn btn-outline-primary btn-sm">查看想法 / Ideas</a></div></div></div>`}).join('');
  questionListEl.querySelectorAll('.set-active-question-btn').forEach(b=>b.addEventListener('click',async e=>{try{e.currentTarget.disabled=true;await setActiveQuestion(discussionId,teacherToken,Number(e.currentTarget.dataset.questionId));await refreshAll();setMessage(questionMessageEl,'目前問題已更新。 / Active question updated.','success');}catch(err){setMessage(questionMessageEl,err.message||'更新失敗。','danger');e.currentTarget.disabled=false;}}));
}
async function refreshAll(){const [state,questions]=await Promise.all([getTeacherState(discussionId,teacherToken),getQuestions(discussionId,teacherToken)]);
  // derive active question number from existing stable sort_order
  const active=questions.find(q=>Number(q.id)===Number(state.active_question_id)); state.active_question_sort_order=active?.sort_order||''; updateStateUi(state); renderQuestionList(questions,state.active_question_id);}

btnCloseDiscussion?.addEventListener('click',async()=>{if(!confirm('確定要結束這個討論嗎？ / End this discussion?'))return;btnCloseDiscussion.disabled=true;try{await closeDiscussion(discussionId,teacherToken);sessionStorage.removeItem(APP_CONFIG.STORAGE_KEYS.teacherDiscussionId);sessionStorage.removeItem(APP_CONFIG.STORAGE_KEYS.teacherToken);sessionStorage.removeItem(APP_CONFIG.STORAGE_KEYS.joinCode);alert('本次討論已結束。 / Discussion ended.');goTo('./index.html');}catch(e){setMessage(questionMessageEl,e.message||'結束討論失敗。','danger');btnCloseDiscussion.disabled=false;}});
btnAddQuestion?.addEventListener('click',async()=>{clearMessage(questionMessageEl);btnAddQuestion.disabled=true;try{const text=(newQuestionTextEl.value||'').trim();if(!text)throw new Error('請先輸入問題內容。 / Enter a question first.');const q=await addQuestion(discussionId,teacherToken,text);newQuestionTextEl.value='';setMessage(questionMessageEl,`Q${q.sort_order} 已新增。 / Question added.`,'success');await refreshAll();}catch(e){setMessage(questionMessageEl,e.message||'新增問題失敗。','danger');}finally{btnAddQuestion.disabled=false;}});
btnSubmitFacilitatorIdea?.addEventListener('click',async()=>{clearMessage(facilitatorIdeaMessage);const text=(facilitatorIdeaText.value||'').trim();if(!currentState?.active_question_id){return setMessage(facilitatorIdeaMessage,'目前沒有作用中的問題。','warning');}if(!text)return setMessage(facilitatorIdeaMessage,'請先輸入想法。 / Enter an idea first.','warning');btnSubmitFacilitatorIdea.disabled=true;try{await submitFacilitatorIdea(discussionId,currentState.active_question_id,teacherToken,text);loadedFacilitatorIdeaQuestionId=Number(currentState.active_question_id);setMessage(facilitatorIdeaMessage,'想法已保存；再次送出會更新這一則想法。 / Idea saved; submit again to update it.','success');}catch(e){setMessage(facilitatorIdeaMessage,e.message||'送出失敗。','danger');}finally{btnSubmitFacilitatorIdea.disabled=false;}});

refreshAll().catch(e=>setMessage(questionMessageEl,e.message||'載入資料失敗。','danger'));
setInterval(()=>refreshAll().catch(()=>{}),APP_CONFIG.POLLING_MS);