const APP_KEY = process.env.FAMILYSEARCH_APP_KEY;
const REDIRECT_URI = process.env.FAMILYSEARCH_REDIRECT_URI || 'https://rootrecorder.com/api/auth/familysearch/callback';
const ENV = process.env.FAMILYSEARCH_ENV || 'beta';
const TOKEN_HOST = ENV === 'production' ? 'ident.familysearch.org' : 'identbeta.familysearch.org';

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function page(title, body, ok) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — RootRecorder</title>
<style>
  body{margin:0;background:#EEF0EA;color:#1C2620;font-family:-apple-system,Karla,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;}
  .box{max-width:480px;padding:40px;text-align:center;}
  h1{font-family:'Big Shoulders',sans-serif;text-transform:uppercase;font-size:1.6rem;margin:0 0 12px;color:${ok ? '#1C2620' : '#B5432B'};}
  p{color:#57635B;line-height:1.6;}
  a{color:#B5432B;}
</style></head>
<body><div class="box"><h1>${title}</h1>${body}<p><a href="/">&larr; Back to RootRecorder</a></p></div></body></html>`;
}

module.exports = async (req, res) => {
  if (!APP_KEY) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    return res.end('FAMILYSEARCH_APP_KEY is not configured on this deployment.');
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const authError = url.searchParams.get('error');
  const cookies = parseCookies(req.headers.cookie);

  if (authError) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/html');
    return res.end(page('Sign-in cancelled', `<p>FamilySearch reported: ${authError}</p>`, false));
  }

  if (!code || !state || state !== cookies.fs_oauth_state) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/html');
    return res.end(
      page(
        'Something went wrong',
        "<p>We couldn't verify this sign-in request. Please try again from RootRecorder.</p>",
        false
      )
    );
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: APP_KEY,
    });

    const tokenRes = await fetch(`https://${TOKEN_HOST}/cis-web/oauth2/v3/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const data = await tokenRes.json();

    if (!tokenRes.ok || !data.access_token) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/html');
      return res.end(
        page(
          'Sign-in failed',
          `<p>FamilySearch didn't return an access token. (${
            data.error_description || data.error || tokenRes.status
          })</p>`,
          false
        )
      );
    }

    const maxAge = Number(data.expires_in) > 0 ? Number(data.expires_in) : 3600;
    res.setHeader('Set-Cookie', [
      `fs_access_token=${data.access_token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`,
      'fs_oauth_state=; Max-Age=0; Path=/',
    ]);
    res.setHeader('Content-Type', 'text/html');
    return res.end(
      page('Connected', '<p>Your FamilySearch account is connected. You can close this tab and return to RootRecorder.</p>', true)
    );
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    return res.end(page('Something went wrong', `<p>${(err && err.message) || 'Unexpected error.'}</p>`, false));
  }
};
