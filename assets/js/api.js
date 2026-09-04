import { supabase } from './supabase-client.js';

function assertNoError(error, defaultMessage) {
  if (error) throw new Error(error.message || defaultMessage);
}

async function rpc(name, params, defaultMessage) {
  const { data, error } = await supabase.rpc(name, params);
  assertNoError(error, defaultMessage);
  return data;
}

function firstRow(data) {
  return Array.isArray(data) ? (data[0] || null) : data;
}

export async function createDiscussion() {
  return firstRow(await rpc('P02_CreateDiscussion', {}, '建立討論失敗'));
}

export async function joinDiscussion(joinCode, nickname) {
  const row = firstRow(await rpc('P02_JoinDiscussion', {
    p_join_code: joinCode,
    p_nickname: nickname
  }, '加入討論失敗'));
  if (!row) throw new Error('加入討論失敗。');
  return {
    discussion: {
      id: row.discussion_id,
      join_code: row.join_code,
      status: row.status
    },
    participant: {
      id: row.participant_id,
      nickname: row.nickname,
      participant_token: row.participant_token
    }
  };
}

export async function getTeacherState(discussionId, teacherToken) {
  return firstRow(await rpc('P02_GetTeacherState', {
    p_discussion_id: discussionId,
    p_teacher_token: teacherToken
  }, '讀取教師端資料失敗'));
}

export async function getQuestions(discussionId, teacherToken) {
  return await rpc('P02_GetQuestions', {
    p_discussion_id: discussionId,
    p_teacher_token: teacherToken
  }, '讀取問題清單失敗') || [];
}

export async function addQuestion(discussionId, teacherToken, questionText) {
  return firstRow(await rpc('P02_AddQuestion', {
    p_discussion_id: discussionId,
    p_teacher_token: teacherToken,
    p_question_text: questionText
  }, '新增問題失敗'));
}

export async function setActiveQuestion(discussionId, teacherToken, questionId) {
  return firstRow(await rpc('P02_SetActiveQuestion', {
    p_discussion_id: discussionId,
    p_teacher_token: teacherToken,
    p_question_id: questionId
  }, '設定作用中問題失敗'));
}

export async function closeDiscussion(discussionId, teacherToken) {
  return firstRow(await rpc('P02_CloseDiscussion', {
    p_discussion_id: discussionId,
    p_teacher_token: teacherToken
  }, '結束討論失敗'));
}

export async function getStudentState(discussionId, participantId, participantToken) {
  return firstRow(await rpc('P02_GetStudentState', {
    p_discussion_id: discussionId,
    p_participant_id: participantId,
    p_participant_token: participantToken
  }, '讀取學生端資料失敗'));
}

export async function submitAnswer(discussionId, questionId, participantId, participantToken, content) {
  return firstRow(await rpc('P02_SubmitAnswer', {
    p_discussion_id: discussionId,
    p_question_id: questionId,
    p_participant_id: participantId,
    p_participant_token: participantToken,
    p_content: content
  }, '送出回答失敗'));
}

export async function leaveDiscussion(discussionId, participantId, participantToken) {
  await rpc('P02_LeaveDiscussion', {
    p_discussion_id: discussionId,
    p_participant_id: participantId,
    p_participant_token: participantToken
  }, '離開討論失敗');
  return true;
}

export async function getQuestionAnswersView(discussionId, questionId, teacherToken) {
  const rows = await rpc('P02_GetQuestionAnswers', {
    p_discussion_id: discussionId,
    p_question_id: questionId,
    p_teacher_token: teacherToken
  }, '讀取回答列表失敗') || [];
  return {
    question: rows.length ? { question_text: rows[0].question_text } : null,
    rows: rows.filter(row => row.participant_id !== null)
  };
}
