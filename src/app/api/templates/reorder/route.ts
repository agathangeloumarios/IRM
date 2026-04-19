import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { ids: string[] }  — persist display order
export async function POST(req: NextRequest) {
  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return NextResponse.json({ error: "ids_array_required" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id, idx) =>
      prisma.template.update({ where: { id }, data: { orderIndex: idx } })
    )
  );
  return NextResponse.json({ ok: true });
}
