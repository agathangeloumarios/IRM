import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize<T extends { chromeJson?: string | null }>(t: T) {
  const { chromeJson, ...rest } = t as any;
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

export async function GET() {
  const rows = await prisma.template.findMany({
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(rows.map(serialize));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    id,
    name,
    category,
    body: tplBody,
    locked = false,
    source = "custom",
    originalFileName,
    chrome,
  } = body ?? {};

  if (!name || !category || typeof tplBody !== "string") {
    return NextResponse.json({ error: "name_category_body_required" }, { status: 400 });
  }
  if (category !== "consultation" && category !== "discharge") {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  // Place new templates at the top by giving them the lowest orderIndex - 1
  const min = await prisma.template.aggregate({ _min: { orderIndex: true } });
  const nextOrder = (min._min.orderIndex ?? 0) - 1;

  try {
    const created = await prisma.template.create({
      data: {
        id,
        name,
        category,
        body: tplBody,
        locked: !!locked,
        source,
        originalFileName: originalFileName ?? null,
        chromeJson: chrome ? JSON.stringify(chrome) : null,
        orderIndex: nextOrder,
        currentVersion: 1,
        versions: {
          create: [
            {
              version: 1,
              name,
              body: tplBody,
              chromeJson: chrome ? JSON.stringify(chrome) : null,
              reason: "initial",
            },
          ],
        },
      },
    });
    return NextResponse.json(serialize(created), { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "duplicate_id" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "create_failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
