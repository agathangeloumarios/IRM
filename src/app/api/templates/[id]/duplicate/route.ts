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

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const src = await prisma.template.findUnique({ where: { id: params.id } });
  if (!src) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const created = await prisma.template.create({
    data: {
      name: src.name + " (Copy)",
      category: src.category,
      body: src.body,
      chromeJson: src.chromeJson,
      locked: false,
      source: "custom",
      originalFileName: src.originalFileName,
      orderIndex: src.orderIndex + 1,
      currentVersion: 1,
      versions: {
        create: [
          {
            version: 1,
            name: src.name + " (Copy)",
            body: src.body,
            chromeJson: src.chromeJson,
            reason: "duplicated from " + src.id,
          },
        ],
      },
    },
  });
  return NextResponse.json(serialize(created), { status: 201 });
}
