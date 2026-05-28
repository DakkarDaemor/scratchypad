export const GDRIVE_CLIENT_ID = '29731384499-qnl2dp9jvihpvlqumprmuccpelp7mf9a.apps.googleusercontent.com';

export const KEYS = {
  GDRIVE_TOKEN:  'sp_gdrive_token',
  GDRIVE_EXPIRY: 'sp_gdrive_expiry',
  GDRIVE_FOLDER: 'sp_gdrive_folder',
  GDRIVE_CONFIG: 'sp_gdrive_config_id',
  SESSION:       'sp_session',
};

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

export const AI_ACTIONS = ['Summarize', 'Improve', 'Fix grammar', 'Shorten', 'IT ↔ EN'];

export const AI_PROMPTS = {
  'Summarize':   c => `Summarize this text concisely. Reply only with the summary.\n\n${c}`,
  'Improve':     c => `Improve clarity and style. Keep the same language. Reply only with the improved text.\n\n${c}`,
  'Fix grammar': c => `Fix grammar and typos. Keep style and language. Reply only with the corrected text.\n\n${c}`,
  'Shorten':     c => `Make this shorter while keeping key points. Same language. Reply only with the result.\n\n${c}`,
  'IT ↔ EN':     c => `If this text is in Italian translate to English; if in English translate to Italian. Reply only with the translation.\n\n${c}`,
};
