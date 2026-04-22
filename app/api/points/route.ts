import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, points } from "@/lib/db";
import { publicUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  title: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  author: z.string().trim().max(60).optional().nullable(),
  photoKey: z.string().min(1),
  photoWidth: z.number().int().positive().optional().nullable(),
  photoHeight: z.number().int().positive().optional().nullable(),
});

export async function GET() {
  const rows = await db.select().from(points).orderBy(desc(points.createdAt));
  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      photoUrl: publicUrl(r.photoKey),
    }))
  );
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;
  const [row] = await db
    .insert(points)
    .values({
      id: nanoid(12),
      lat: data.lat,
      lng: data.lng,
      title: data.title || null,
      description: data.description || null,
      author: data.author || null,
      photoKey: data.photoKey,
      photoWidth: data.photoWidth ?? null,
      photoHeight: data.photoHeight ?? null,
    })
    .returning();
  return NextResponse.json({ ...row, photoUrl: publicUrl(row.photoKey) }, { status: 201 });
}
