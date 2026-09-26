import fs from 'fs';
import path from 'path';

import { pool } from './pool';

const MIGRATIONS_DIR = path.join(
  __dirname,
  '..',
  '..',
  'db',
  'migrations',
);

interface MigrationRow {
  name: string;
}

async function run(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file: string) => file.endsWith('.sql'))
    .sort();

  const { rows } = await pool.query<MigrationRow>(
    'SELECT name FROM schema_migrations',
  );

  const applied = new Set<string>(
    rows.map((row: MigrationRow) => row.name),
  );

  let ranAny = false;

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    ranAny = true;

    const sql = fs.readFileSync(
      path.join(MIGRATIONS_DIR, file),
      'utf8',
    );

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(sql);

      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [file],
      );

      await client.query('COMMIT');

      console.log(`[migrate] applied ${file}`);
    } catch (err: unknown) {
      await client.query('ROLLBACK');

      console.error(`[migrate] FAILED on ${file}`);

      throw err;
    } finally {
      client.release();
    }
  }

  if (!ranAny) {
    console.log('[migrate] database already up to date');
  }
}

run()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[migrate] migration run failed:', err);
    process.exit(1);
  });
