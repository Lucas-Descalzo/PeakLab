import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Only available in local dev — writes new keys into .env.local
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use Vercel env dashboard in production" }, { status: 403 });
  }

  try {
    const { envContent } = await req.json();
    const envPath = join(process.cwd(), ".env.local");

    let existing = "";
    try { existing = readFileSync(envPath, "utf-8"); } catch { existing = ""; }

    // Merge: update existing keys, append new ones
    const existingLines = existing.split("\n").filter(Boolean);
    const newLines = (envContent as string).split("\n").filter(Boolean);

    const merged = new Map<string, string>();
    for (const line of existingLines) {
      const [key] = line.split("=");
      if (key) merged.set(key.trim(), line);
    }
    for (const line of newLines) {
      const [key] = line.split("=");
      if (key && !key.startsWith("#")) merged.set(key.trim(), line);
    }

    writeFileSync(envPath, Array.from(merged.values()).join("\n") + "\n");
    return NextResponse.json({ status: "saved" });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
