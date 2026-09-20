module.exports = (req, res) => {
  res.setHeader('Set-Cookie', 'fs_access_token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  res.writeHead(302, { Location: '/' });
  res.end();
};
