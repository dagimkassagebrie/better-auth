import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = db
    .prepare(
      `SELECT id, short_code, original_url, clicks, created_at
       FROM links
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(session.user.id);

  return Response.json({ links });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url) {
    return Response.json({ error: "URL is required" }, { status: 400 });
  }

  const shortCode = nanoid(6);
  const id = nanoid();

  db.prepare(
    `INSERT INTO links (id, user_id, short_code, original_url, clicks, created_at)
     VALUES (?, ?, ?, ?, 0, datetime('now'))`
  ).run(id, session.user.id, shortCode, url);

  return Response.json({
    id,
    short_code: shortCode,
    original_url: url,
    clicks: 0,
  });
}
