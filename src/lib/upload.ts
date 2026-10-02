import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import sharp from "sharp";
import { db, schema } from "@/db";

// Runtime-configured; not part of the build output.
export const UPLOAD_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./data/uploads",
);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES = 9;
const ACCEPTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

export function isAcceptedImage(type: string) {
  return ACCEPTED.has(type);
}

/** Re-encode to WebP (strips EXIF/GPS) and store a full and a thumb size. */
export async function storeImage(userId: string, input: Buffer) {
  const id = nanoid(16);
  const base = sharp(input, { failOn: "error" }).rotate();
  const full = await base
    .clone()
    .resize({
      width: 1800,
      height: 1800,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({
      width: 480,
      height: 480,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 72 })
    .toBuffer();

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, `${id}.webp`), full.data);
  await writeFile(path.join(UPLOAD_DIR, `${id}_t.webp`), thumb);
  await db.insert(schema.upload).values({
    id,
    userId,
    width: full.info.width,
    height: full.info.height,
  });
  return { id, width: full.info.width, height: full.info.height };
}

/** Only allow attaching images the user uploaded themselves. */
export async function ownsUploads(userId: string, ids: string[]) {
  if (ids.length === 0) return true;
  const rows = await db
    .select({ id: schema.upload.id })
    .from(schema.upload)
    .where(
      and(eq(schema.upload.userId, userId), inArray(schema.upload.id, ids)),
    );
  return rows.length === new Set(ids).size;
}

export function imageUrl(id: string, size: "full" | "thumb" = "full") {
  return `/uploads/${id}${size === "thumb" ? "_t" : ""}.webp`;
}
