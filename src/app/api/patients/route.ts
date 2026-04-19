import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.patient.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    id,
    mrn,
    fullName,
    dob,
    docId,
    referralId,
    phone,
    gender,
    visitDate,
    reportDate,
    activity,
    referringDoctor,
    status = "active",
    source = "manual",
    isTemplateSource = false,
  } = body ?? {};

  if (!mrn || !fullName) {
    return NextResponse.json({ error: "mrn_and_fullName_required" }, { status: 400 });
  }

  const naturalKey =
    body.naturalKey || [docId || "", referralId || "", visitDate || id].join("|");

  try {
    const created = await prisma.patient.create({
      data: {
        id,
        mrn,
        fullName,
        dob: dob || "",
        docId: docId || "",
        referralId: referralId || "",
        phone: phone || "",
        gender: gender || "",
        visitDate: visitDate || "",
        reportDate: reportDate || "",
        activity: activity || "",
        referringDoctor: referringDoctor || "",
        status,
        source,
        isTemplateSource,
        naturalKey,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "duplicate", fields: e.meta?.target }, { status: 409 });
    }
    return NextResponse.json({ error: "create_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}
