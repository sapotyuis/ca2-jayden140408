// ✏️ EDIT THIS FILE — add your own table schemas below the example `tasks` table.
// After adding a new table, run `npm run db` to recreate the database.

/**
 * All table schemas live here. Add new tables below and run `npm run db` to apply.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/** Tasks table. */
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
