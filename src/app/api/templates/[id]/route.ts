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
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = await prisma.template.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(serialize(row));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = await req.json();
  const {
    name,
    category,
    body,
    chrome,
    locked,
    orderIndex,
    expectedVersion,
    reason,
  } = patch ?? {};

  return await prisma.$transaction(async (tx) => {
    const current = await tx.template.findUnique({ where: { id: params.id } });
    if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // Lock toggles are always allowed; content edits are blocked while locked.
    const contentEdit =
      name !== undefined ||
      category !== undefined ||
      body !== undefined ||
      chrome !== undefined;

    if (current.locked && contentEdit && locked !== false) {
      return NextResponse.json({ error: "locked" }, { status: 409 });
    }

    // Optimistic concurrency for content edits
    if (contentEdit && typeof expectedVersion === "number" && expectedVersion !== current.currentVersion) {
      return NextResponse.json(
        { error: "version_conflict", current: serialize(current) },
        { status: 409 }
      );
    }

    // Snapshot previous content before overwriting
    if (contentEdit) {
      await ensureVersionSnapshot(tx, current, reason ?? null);
    }

    const updated = await tx.template.update({
      where: { id: current.id },
      data: {
        name: name ?? current.name,
        category: category ?? current.category,
        body: body ?? current.body,
        chromeJson:
          chrome === undefined
            ? current.chromeJson
            : chrome === null
            ? null
            : JSON.stringify(chrome),
        locked: locked === undefined ? current.locked : !!locked,
        orderIndex: orderIndex === undefined ? current.orderIndex : orderIndex,
        currentVersion: contentEdit ? current.currentVersion + 1 : current.currentVersion,
      },
    });

    return NextResponse.json(serialize(updated));
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existing = await prisma.template.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.locked) return NextResponse.json({ error: "locked" }, { status: 409 });
    await prisma.template.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: "delete_failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
