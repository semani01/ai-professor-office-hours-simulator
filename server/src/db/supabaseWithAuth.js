const { createClient } = require('@supabase/supabase-js');

/**
 * Return a Supabase client that operates under the given user's JWT.
 * This allows row-level security policies to apply correctly — all reads/writes
 * are scoped to the authenticated user without any extra filtering needed in code.
 *
 * @param {string} jwt - the Supabase access token from the frontend session
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getAuthClient(jwt) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    }
  );
}

/**
 * Extract the JWT from an Express request's Authorization header.
 * Returns null if the header is missing or malformed.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractJwt(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * Get the user ID from a JWT using the Supabase admin client.
 * Returns null on failure (non-fatal — callers handle missing userId).
 *
 * @param {string} jwt
 * @returns {Promise<string|null>}
 */
async function getUserId(jwt) {
  const client = getAuthClient(jwt);
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

module.exports = { getAuthClient, extractJwt, getUserId };
