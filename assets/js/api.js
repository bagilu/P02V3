import { supabase } from './supabase-client.js';
import { APP_CONFIG } from './config.js';

const T = APP_CONFIG.TABLES;

function assertNoError(error, defaultMessage) {
  if (error) {
    throw new Error(error.message || defaultMessage);
  }
}

function formatAnswerTimestamp(isoString) {
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) {
    return isoString;
  }

  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function buildAnswerHistoryBlock(submittedAtIso, answerText) {
  return `(${formatAnswerTimestamp(submittedAtIso)})${answerText}`;
}

export async function generateUniqueJoinCode() {
  for (let i = 0; i < 30; i += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { data, error } = await supabase
      .from(T.discussions)
      .select('id')
      .eq('join_code', code)
      .eq('status', 'open')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message || '檢查 join_code 失敗');
    }

    if (!data) return code;
  }

  throw new Error('目前無法產生可用的 4 位數討論代碼，請稍後再試。');
}

export async function createDiscussion() {
  const joinCode = await generateUniqueJoinCode();

  const { data, error } = await supabase
    .from(T.discussions)
    .insert({ join_code: joinCode, status: 'open' })
    .select('id, join_code, teacher_token, status, active_question_id')
    .single();

  assertNoError(error, '建立討論失敗');
  return data;
}

export async function getDiscussionById(discussionId) {
  const { data, error } = await supabase
    .from(T.discussions)
    .select('id, join_code, status, teacher_token, active_question_id, title')
    .eq('id', discussionId)
    .single();

  assertNoError(error, '讀取討論資料失敗');
  return data;
}

export async function getDiscussionByCode(joinCode) {
  const { data, error } = await supabase
    .from(T.discussions)
    .select('id, join_code, status, active_question_id')
    .eq('join_code', joinCode)
    .eq('status', 'open')
    .single();

  assertNoError(error, '讀取討論代碼失敗');
  return data;
}

export async function getParticipantCount(discussionId) {
  const { count, error } = await supabase
    .from(T.participants)
    .select('*', { count: 'exact', head: true })
    .eq('discussion_id', discussionId)
    .is('left_at', null);

  assertNoError(error, '讀取加入人數失敗');
  return count || 0;
}

export async function joinDiscussion(joinCode, nickname) {
  const discussion = await getDiscussionByCode(joinCode);
  if (!discussion || discussion.status !== 'open') {
    throw new Error('代碼錯誤，請重新輸入。');
  }

  const { data: existing, error: existingError } = await supabase
    .from(T.participants)
    .select('id, discussion_id, nickname, left_at')
    .eq('discussion_id', discussion.id)
    .ilike('nickname', nickname)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(existingError.message || '檢查暱稱失敗');
  }

  if (existing) {
    if (existing.left_at) {
      const { data: revived, error: updateError } = await supabase
        .from(T.participants)
        .update({ left_at: null })
        .eq('id', existing.id)
        .select('id, discussion_id, nickname')
        .single();

      assertNoError(updateError, '重新加入討論失敗');
      return { discussion, participant: revived };
    }
    return { discussion, participant: existing };
  }

  const { data: participant, error } = await supabase
    .from(T.participants)
    .insert({ discussion_id: discussion.id, nickname })
    .select('id, discussion_id, nickname')
    .single();

  assertNoError(error, '加入討論失敗');
  return { discussion, participant };
}

export async function leaveDiscussion(participantId) {
  const { error } = await supabase
    .from(T.participants)
    .update({ left_at: new Date().toISOString() })
    .eq('id', participantId);

  assertNoError(error, '離開討論失敗');
  return true;
}

export async function getQuestions(discussionId) {
  const { data, error } = await supabase
    .from(T.questions)
    .select('id, discussion_id, question_text, sort_order, created_at')
    .eq('discussion_id', discussionId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  assertNoError(error, '讀取問題清單失敗');
  return data || [];
}

export async function addQuestion(discussionId, teacherToken, questionText) {
  const discussion = await getDiscussionById(discussionId);
  if (!discussion || discussion.teacher_token !== teacherToken) {
    throw new Error('教師權杖驗證失敗。');
  }

  const questions = await getQuestions(discussionId);
  const nextSort = questions.length > 0 ? Math.max(...questions.map(q => q.sort_order)) + 1 : 1;

  const { data, error } = await supabase
    .from(T.questions)
    .insert({
      discussion_id: discussionId,
      question_text: questionText,
      sort_order: nextSort
    })
    .select('id, discussion_id, question_text, sort_order, created_at')
    .single();

  assertNoError(error, '新增問題失敗');
  return data;
}

export async function setActiveQuestion(discussionId, teacherToken, questionId) {
  const { data, error } = await supabase
    .from(T.discussions)
    .update({ active_question_id: questionId })
    .eq('id', discussionId)
    .eq('teacher_token', teacherToken)
    .select('id, active_question_id')
    .single();

  assertNoError(error, '設定作用中問題失敗');
  return data;
}

export async function closeDiscussion(discussionId, teacherToken) {
  const { data, error } = await supabase
    .from(T.discussions)
    .update({ status: 'closed', active_question_id: null })
    .eq('id', discussionId)
    .eq('teacher_token', teacherToken)
    .eq('status', 'open')
    .select('id, join_code, status, active_question_id')
    .single();

  assertNoError(error, '結束討論失敗');
  return data;
}

export async function getActiveQuestion(discussionId) {
  const discussion = await getDiscussionById(discussionId);
  if (!discussion.active_question_id) return null;

  const { data, error } = await supabase
    .from(T.questions)
    .select('id, discussion_id, question_text, sort_order')
    .eq('id', discussion.active_question_id)
    .single();

  assertNoError(error, '讀取作用中問題失敗');
  return data;
}

export async function getQuestionById(questionId) {
  const { data, error } = await supabase
    .from(T.questions)
    .select('id, discussion_id, question_text, sort_order')
    .eq('id', questionId)
    .single();

  assertNoError(error, '讀取問題失敗');
  return data;
}

export async function submitAnswer(discussionId, questionId, participantId, latestAnswerText) {
  const discussion = await getDiscussionById(discussionId);
  if (!discussion || discussion.status !== 'open') {
    throw new Error('本討論已結束，無法再送出回答。');
  }

  const submittedAt = new Date().toISOString();

  const { data: existing, error: existingError } = await supabase
    .from(T.answers)
    .select('id, content, submitted_at')
    .eq('question_id', questionId)
    .eq('participant_id', participantId)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(existingError.message || '讀取既有回答失敗');
  }

  const newBlock = buildAnswerHistoryBlock(submittedAt, latestAnswerText);
  const mergedContent = existing?.content
    ? `${existing.content}\n${newBlock}`
    : newBlock;

  const payload = {
    discussion_id: discussionId,
    question_id: questionId,
    participant_id: participantId,
    content: mergedContent,
    submitted_at: submittedAt
  };

  const { data, error } = await supabase
    .from(T.answers)
    .upsert(payload, { onConflict: 'question_id,participant_id' })
    .select('id, discussion_id, question_id, participant_id, content, submitted_at')
    .single();

  assertNoError(error, '送出回答失敗');
  return data;
}

export async function getParticipants(discussionId) {
  const { data, error } = await supabase
    .from(T.participants)
    .select('id, discussion_id, nickname, joined_at, left_at')
    .eq('discussion_id', discussionId)
    .order('joined_at', { ascending: true });

  assertNoError(error, '讀取參與者失敗');
  return data || [];
}

export async function getAnswersByQuestion(questionId) {
  const { data, error } = await supabase
    .from(T.answers)
    .select('id, question_id, participant_id, content, submitted_at')
    .eq('question_id', questionId)
    .order('submitted_at', { ascending: true });

  assertNoError(error, '讀取回答列表失敗');
  return data || [];
}

export async function getQuestionAnswersView(discussionId, questionId) {
  const [question, participants, answers] = await Promise.all([
    getQuestionById(questionId),
    getParticipants(discussionId),
    getAnswersByQuestion(questionId)
  ]);

  const answerMap = new Map(answers.map(item => [item.participant_id, item]));
  const rows = participants.map(p => {
    const answer = answerMap.get(p.id);
    return {
      nickname: p.nickname,
      submitted_at: answer?.submitted_at || '',
      content: answer?.content || ''
    };
  });

  return { question, rows };
}
