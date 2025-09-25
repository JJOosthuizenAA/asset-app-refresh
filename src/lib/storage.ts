// src/lib/storage.ts
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export async function saveUploadedFile(file: File, subdir: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const targetDir = path.join(uploadsRoot, subdir);
  await fs.mkdir(targetDir, { recursive: true });

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const randomName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const storedName = ext ? `${randomName}.${ext}` : randomName;
  const fullPath = path.join(targetDir, storedName);

  await fs.writeFile(fullPath, buffer);
  const publicUrl = `/uploads/${subdir}/${storedName}`;

  return {
    path: fullPath,
    url: publicUrl,
    storedName,
    originalName: file.name,
    size: buffer.length,
    contentType: file.type ?? null,
  };
}
