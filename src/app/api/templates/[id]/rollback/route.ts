import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(t: any) {
  const { chromeJson, ...rest } = t;
  return {
    ...rest,
    chrome: chromeJson ? safeJson(chromeJson) : undefined,
  };
}
function safeJson(s: string | null | undefined) {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
}

async function ensureVersionSnapshot(tx: typeof prisma, current: any, reason?: string | null) {
  const existing = await tx.templateVersion.findUnique({
    where: {
      templateId_version: {
        templateId: current.id,
        version: current.currentVersion,
      },
    },
  });

  if (existing) return existing;

  return tx.templateVersion.create({
    data: {
      templateId: current.id,
      version: current.currentVersion,
      name: current.name,
      body: current.body,
      chromeJson: current.chromeJson,
      reason: reason ?? null,
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { version } = await req.json();
  if (typeof version !== "number") {
    return NextResponse.json({ error: "version_required" }, { status: 400 });
  }

  return await prisma.$transaction(async (tx) => {
    const current = await tx.template.findUnique({ where: { id: params.id } });
    if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (current.locked) return NextResponse.json({ error: "locked" }, { status: 409 });

    const target = await tx.templateVersion.findUnique({
      where: { templateId_version: { templateId: params.id, version } },
    });
    if (!target) return NextResponse.json({ error: "version_not_found" }, { status: 404 });

    // Snapshot current before rollback (never destructive)
    await ensureVersionSnapshot(
      tx,
      current,
      `pre-rollback snapshot (rolling to v${version})`
    );

    const updated = await tx.template.update({
      where: { id: current.id },
      data: {
        name: target.name,
        body: target.body,
        chromeJson: target.chromeJson,
        currentVersion: current.currentVersion + 1,
      },
    });

    return NextResponse.json(serialize(updated));
  });
}
