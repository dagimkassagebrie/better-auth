import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params;

  const link = db
    .prepare(`SELECT original_url FROM links WHERE short_code = ?`)
    .get(shortCode) as { original_url: string } | undefined;

  if (!link) {
    return new Response("Not found", { status: 404 });
  }

  // Increment click count
  db.prepare(`UPDATE links SET clicks = clicks + 1 WHERE short_code = ?`).run(
    shortCode
  );

  redirect(link.original_url);
}
