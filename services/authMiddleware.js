const { supabaseAuthVerifier } = require('./supabaseClient');

/**
 * Requires a valid Supabase Auth bearer token.
 * Any account able to log in is treated as admin — public signup must stay
 * disabled in Supabase (Authentication > Providers > Email > disable "Allow new users to sign up"),
 * and admin accounts are created manually from the Supabase dashboard.
 */
async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const { data, error } = await supabaseAuthVerifier.auth.getUser(token);
    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    req.adminUser = data.user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
}

module.exports = { requireAdmin };
