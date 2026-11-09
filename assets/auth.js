/* Nandi Go — traveller sign-in with Google (same Supabase project as admin).
 * Needs the supabase-js UMD script first. Fires "ng:auth" on document whenever the signed-in user changes. */
(function () {
  if (!window.supabase) return;
  var URL_ = 'https://hvxzgvigrlkovehfwtob.supabase.co';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eHpndmlncmxrb3ZlaGZ3dG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxMTMwNzUsImV4cCI6MjEwOTY4OTA3NX0.fdLsA5H8rw-iRTd9-_5uM4lrkfb94dEvkZf8DAltaeg'; // public anon key: safe in the browser, data is protected by database rules
  var sb = window.supabase.createClient(URL_, KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
  var cur = null, ready = false;
  function emit() { document.dispatchEvent(new CustomEvent('ng:auth', { detail: { user: cur && cur.user } })); }
  sb.auth.getSession().then(function (r) { cur = r.data.session; ready = true; emit(); });
  sb.auth.onAuthStateChange(function (ev, session) {
    var before = cur && cur.user && cur.user.id, after = session && session.user && session.user.id;
    cur = session;
    if (ready && before !== after) emit();
  });
  window.NGAuth = {
    client: sb,
    ready: function () { return ready; },
    user: function () { return cur && cur.user; },
    token: function () { return cur && cur.access_token; },
    name: function () { var u = cur && cur.user; return u ? ((u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email) : ''; },
    signIn: function (back) {
      return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back || location.href.split('#')[0], queryParams: { prompt: 'select_account' } } });
    },
    signOut: function () { return sb.auth.signOut().then(function () { cur = null; emit(); }); },
    // call an Edge Function as the signed-in traveller
    fn: function (name, body) {
      var h = { apikey: KEY, 'Content-Type': 'application/json' };
      if (cur && cur.access_token) h.Authorization = 'Bearer ' + cur.access_token;
      return fetch(URL_ + '/functions/v1/' + name, { method: 'POST', headers: h, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || ('Error ' + r.status)); e.data = j; throw e; } return j; }); });
    }
  };
})();
