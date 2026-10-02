import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getViewer } from "@/lib/session";
import { isAcceptedImage, MAX_UPLOAD_BYTES, storeImage } from "@/lib/upload";

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  }
  if (!isAcceptedImage(file.type)) {
    return NextResponse.json({ error: "BAD_TYPE" }, { status: 415 });
  }
  if (!(await rateLimit(`upload:${viewer.id}`, 100))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  try {
    const image = await storeImage(
      viewer.id,
      Buffer.from(await file.arrayBuffer()),
    );
    return NextResponse.json(image);
  } catch (e) {
    console.error("[upload] failed to process image", e);
    return NextResponse.json({ error: "BAD_IMAGE" }, { status: 422 });
  }
}
