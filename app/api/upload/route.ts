import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { presignUpload, publicUrl } from "@/lib/r2";

export const runtime = "nodejs";

const bodySchema = z.object({
  contentType: z.string().regex(/^image\/(jpeg|png|webp|heic|heif)$/i),
  ext: z.string().regex(/^[a-z0-9]{1,5}$/i),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { contentType, ext } = parsed.data;
  const key = `photos/${Date.now()}-${nanoid(12)}.${ext.toLowerCase()}`;
  const uploadUrl = await presignUpload(key, contentType);
  return NextResponse.json({
    key,
    uploadUrl,
    publicUrl: publicUrl(key),
  });
}
