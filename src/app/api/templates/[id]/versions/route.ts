import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeJson(s: string | null | undefined) {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rows = await prisma.templateVersion.findMany({
    where: { templateId: params.id },
    orderBy: { version: "desc" },
  });
  return NextResponse.json(
    rows.map((v) => ({
      id: v.id,
      templateId: v.templateId,
      version: v.version,
      name: v.name,
      body: v.body,
      chrome: safeJson(v.chromeJson),
      createdAt: v.createdAt,
      reason: v.reason,
    }))
  );
}
