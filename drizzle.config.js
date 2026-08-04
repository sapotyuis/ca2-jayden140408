// ⚠️ DO NOT MODIFY THIS FILE — it is part of the project infrastructure.

import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL || 'file:local.db';
const isRemoteDatabase = /^(libsql|https?):\/\//.test(databaseUrl);

export default {
  schema: './src/db/schema.js',
  dialect: isRemoteDatabase ? 'turso' : 'sqlite',
  dbCredentials: {
    url: databaseUrl,
    ...(isRemoteDatabase && process.env.DATABASE_AUTH_TOKEN
      ? { authToken: process.env.DATABASE_AUTH_TOKEN }
      : {}),
  },
};
