import Database from "better-sqlite3";

export const db = new Database("sqlite.db");

// Create links table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    short_code TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    user_id TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

export interface Link {
  id: string;
  short_code: string;
  original_url: string;
  user_id: string;
  clicks: number;
  created_at: string;
}

export function createLink(link: Omit<Link, "clicks" | "created_at">) {
  const stmt = db.prepare(`
    INSERT INTO links (id, short_code, original_url, user_id)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(link.id, link.short_code, link.original_url, link.user_id);
}

export function getLinkByShortCode(shortCode: string): Link | undefined {
  const stmt = db.prepare("SELECT * FROM links WHERE short_code = ?");
  return stmt.get(shortCode) as Link | undefined;
}

export function getLinksByUserId(userId: string): Link[] {
  const stmt = db.prepare(
    "SELECT * FROM links WHERE user_id = ? ORDER BY created_at DESC"
  );
  return stmt.all(userId) as Link[];
}

export function incrementClicks(shortCode: string) {
  const stmt = db.prepare(
    "UPDATE links SET clicks = clicks + 1 WHERE short_code = ?"
  );
  stmt.run(shortCode);
}
