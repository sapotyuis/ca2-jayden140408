// Keep deployments created with the original Vercel variable names working while
// the project uses the canonical names documented in .env.example.

const copyIfMissing = (canonicalName, legacyName) => {
  if (
    process.env.VERCEL
    && process.env[canonicalName] === undefined
    && process.env[legacyName]
  ) {
    process.env[canonicalName] = process.env[legacyName];
  }
};

copyIfMissing('DATABASE_URL', 'turso_db_url');
copyIfMissing('DATABASE_AUTH_TOKEN', 'token');
copyIfMissing('JWT_SECRET_KEY', 'jwt_secret_key');
