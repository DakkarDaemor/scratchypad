export const GDRIVE_CLIENT_ID = '29731384499-qnl2dp9jvihpvlqumprmuccpelp7mf9a.apps.googleusercontent.com';

export const DEFAULT_AI_CONFIG = {
  provider:        'claude',
  claudeKey:       '',
  openrouterKey:   '',
  openrouterModel: 'google/gemini-2.0-flash-exp:free',
  groqKey:         '',
  groqModel:       'llama-3.3-70b-versatile',
};

export const STATUS_COLOR = { ok: '#6aa4bc', err: '#c46a6a', warn: '#9b85c4', info: '#9b85c4' };

export const KEYS = {
  GDRIVE_TOKEN:  'sp_gdrive_token',
  GDRIVE_EXPIRY: 'sp_gdrive_expiry',
  GDRIVE_FOLDER: 'sp_gdrive_folder',
  GDRIVE_CONFIG: 'sp_gdrive_config_id',
  SESSION:       'sp_session',
  FONT_SIZE:     'sp_font_size',
  SNIPPET_INDEX: 'sp_snippet_index',
};

export const FONT_MIN     = 12;
export const FONT_MAX     = 32;
export const FONT_DEFAULT = 17;

export const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@300;400&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; }
  ::selection { background: #9b85c433; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #c8c0d8; border-radius: 2px; }
  textarea::placeholder { color: #aaa8b8; }
  input::placeholder { color: #aaa8b8; }
`;

export const AI_ACTIONS = ['Summarize', 'Improve', 'Fix grammar', 'Shorten', 'Expand', 'Bullet points', 'Tone', 'IT ↔ EN'];

export const AI_PROMPTS = {
  'Summarize':     c => `Summarize this text concisely. Use the same language as the text. Reply only with the summary.\n\n${c}`,
  'Improve':       c => `Improve clarity and style. Keep the same language. Reply only with the improved text.\n\n${c}`,
  'Fix grammar':   c => `Fix grammar and typos. Keep style and language. Reply only with the corrected text.\n\n${c}`,
  'Shorten':       c => `Make this shorter while keeping key points. Same language. Reply only with the result.\n\n${c}`,
  'Expand':        c => `Expand this into a fuller, well-written text. Keep the same language and voice. Reply only with the result.\n\n${c}`,
  'Bullet points': c => `Convert this text into a clear bullet-point list. If it is already a list, convert it back to prose. Keep the same language. Reply only with the result.\n\n${c}`,
  'Tone':          c => `If this text sounds informal, make it formal. If it sounds formal, make it informal. Keep the same language and meaning. Reply only with the result.\n\n${c}`,
  'IT ↔ EN':       c => `If this text is in Italian translate to English; if in English translate to Italian. Reply only with the translation.\n\n${c}`,
};
