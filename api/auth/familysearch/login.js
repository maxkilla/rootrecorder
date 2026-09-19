const crypto = require('crypto');

const APP_KEY = process.env.FAMILYSEARCH_APP_KEY;
const REDIRECT_URI = process.env.FAMILYSEARCH_REDIRECT_URI || 'https://rootrecorder.com/api/auth/familysearch/callback';
const ENV = process.env.FAMILYSEARCH_ENV || 'beta';
const AUTH_HOST = ENV === 'production' ? 'ident.familysearch.org' : 'identbeta.familysearch.org';

module.exports = (req, res) => {
  if (!APP_KEY) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html');
    return res.end('FAMILYSEARCH_APP_KEY is not configured on this deployment.');
  }

  const state = crypto.randomBytes(16).toString('hex');

  res.setHeader(
    'Set-Cookie',
    `fs_oauth_state=${state}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`
  );

  const authorizeUrl = new URL(`https://${AUTH_HOST}/cis-web/oauth2/v3/authorization`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', APP_KEY);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('state', state);

  res.writeHead(302, { Location: authorizeUrl.toString() });
  res.end();
};
