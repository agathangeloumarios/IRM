import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/server/db";
import {
  parsePatientXml,
  buildPatientFromXml,
  naturalKeyFromExtracted,
} from "@/lib/xml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { xml, phone, fileName } = await req.json();

  if (!xml || typeof xml !== "string") {
    return NextResponse.json({ ok: false, error: "xml_required" }, { status: 400 });
  }

  const hash = createHash("sha256").update(xml).digest("hex");

  // Layer 1: same file bytes => idempotent replay
  const prior = await prisma.importLog.findUnique({ where: { hash } });
  if (prior?.patientId) {
    const patient = await prisma.patient.findUnique({ where: { id: prior.patientId } });
    if (patient) {
      return NextResponse.json({ ok: true, deduped: true, patient });
    }
  }

  // Parse + validate
  const { extracted, violations } = parsePatientXml(xml);
  if (violations.length && Object.values(extracted).every((v) => !v)) {
    await prisma.importLog.create({
      data: {
        hash,
        fileName: fileName ?? null,
        status: "rejected",
        violations: violations.join("; "),
      },
    });
    return NextResponse.json({ ok: false, error: "parse_failed", violations }, { status: 400 });
  }

  // Layer 2: same record content dedup
  const naturalKey = naturalKeyFromExtracted(extracted);
  if (naturalKey.replace(/\|/g, "").length > 0) {
    const existing = await prisma.patient.findUnique({ where: { naturalKey } });
    if (existing) {
      await prisma.importLog.create({
        data: {
          hash,
          fileName: fileName ?? null,
          status: "duplicate",
          patientId: existing.id,
        },
      });
      return NextResponse.json({ ok: true, deduped: true, patient: existing, violations });
    }
  }

  const built = buildPatientFromXml(extracted, phone || "");

  try {
    const patient = await prisma.$transaction(async (tx) => {
      const p = await tx.patient.create({
        data: {
          id: built.id,
          mrn: built.mrn,
          fullName: built.fullName,
          dob: built.dob,
          docId: built.docId,
          referralId: built.referralId,
          phone: built.phone,
          gender: built.gender,
          visitDate: built.visitDate,
          reportDate: built.reportDate,
          activity: built.activity,
          referringDoctor: built.referringDoctor,
          status: built.status,
          source: built.source,
          naturalKey,
          importHash: hash,
          importedAt: new Date(),
        },
      });
      await tx.importLog.create({
        data: {
          hash,
          fileName: fileName ?? null,
          status: "ok",
          patientId: p.id,
        },
      });
      return p;
    });

    return NextResponse.json({ ok: true, patient, violations });
  } catch (e: any) {
    // Collision on mrn/naturalKey — treat as duplicate
    if (e?.code === "P2002") {
      const existing = await prisma.patient.findUnique({ where: { naturalKey } });
      if (existing) {
        return NextResponse.json({ ok: true, deduped: true, patient: existing, violations });
      }
    }
    return NextResponse.json(
      { ok: false, error: "persist_failed", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
