// config.js: where Lumen's cloud (Supabase) lives.
//
// These two values are PUBLIC on purpose: every visitor's browser needs them to talk to the database.
// They do not give access to anybody's data. What protects the data is Row Level Security (RLS)
// in the database: every table has a rule "a user can only see and change rows where user_id = their own id".
// (Never put the *secret* / service_role key in front-end code: that one bypasses RLS.)
export const SUPABASE_URL = 'https://mvonovmjnxkyrmdewnxm.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_I3hWAEvW1rprdth5bIgt9A_Lj_LZMKj';

// supabase-js, the official client library, loaded as an ES module from a CDN (no build step needed)
export const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
