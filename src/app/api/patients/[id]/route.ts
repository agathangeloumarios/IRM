import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const row = await prisma.patient.findUnique({ where: { id: params.id } });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const patch = await req.json();
  // Never allow client to change identity or audit fields.
  delete patch.id;
  delete patch.createdAt;
  delete patch.naturalKey;
  delete patch.importHash;

  try {
    const updated = await prisma.patient.update({
      where: { id: params.id },
      data: patch,
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ error: "update_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.patient.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ error: "delete_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}
