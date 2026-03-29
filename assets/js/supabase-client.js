import { APP_CONFIG } from './config.js';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = APP_CONFIG;

if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR-PROJECT') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) {
  console.warn('請先在 assets/js/config.js 設定 Supabase URL 與 ANON KEY。');
}

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
