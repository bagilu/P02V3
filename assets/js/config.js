export const APP_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  TABLES: {
    discussions: 'TblP02Discussions',
    questions: 'TblP02Questions',
    participants: 'TblP02Participants',
    answers: 'TblP02Answers'
  },
  POLLING_MS: 3000,
  STORAGE_KEYS: {
    teacherDiscussionId: 'p02_teacher_discussion_id',
    teacherToken: 'p02_teacher_token',
    joinCode: 'p02_join_code',
    studentDiscussionId: 'p02_student_discussion_id',
    participantId: 'p02_participant_id',
    nickname: 'p02_nickname',
    showNickname: 'p02_show_nickname'
  }
};
