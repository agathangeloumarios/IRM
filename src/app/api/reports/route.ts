/**
 * /api/reports
 * 
 * POST: Create a new Discharge Report with provided demographics.
 * GET: List recent Discharge Reports
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { applyPlaceholders, type PlaceholderContext } from "@/lib/placeholders";
import { formFieldsToPlaceholderContext, type DischargeFormFields } from "@/lib/discharge-demographics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reports
 * 
 * Request body:
 * {
 *   templateId: string
 *   formFields: DischargeFormFields
 *   additionalContext?: Partial<PlaceholderContext>  // for non-demo fields
 * }
 * 
 * Returns: { id, templateId, reportBody, createdAt }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { templateId, formFields, additionalContext } = body as {
      templateId: string;
      formFields: DischargeFormFields;
      additionalContext?: Partial<PlaceholderContext>;
    };

    if (!templateId || !formFields) {
      return NextResponse.json(
        { error: "Missing templateId or formFields" },
        { status: 400 },
      );
    }

    // Get template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    // Convert form fields to placeholder context
    const demographicsContext = formFieldsToPlaceholderContext(formFields);

    // Merge with any additional context (e.g., clinical notes, admission dates)
    const fullContext: PlaceholderContext = {
      ...demographicsContext,
      ...additionalContext,
    };

    // Apply placeholders to template body
    const reportBody = applyPlaceholders(template.body, fullContext);

    // Save to database
    const dischargeReport = await prisma.dischargeReport.create({
      data: {
        templateId,
        patientName: formFields.patientName,
        hioCode: formFields.hioCode,
        idPassportNo: formFields.idPassportNo,
        hospitalId: formFields.hospitalId,
        dateOfBirth: formFields.dateOfBirth,
        occupation: formFields.occupation,
        gender: formFields.gender,
        address: formFields.address,
        telephone: formFields.telephone,
        referralDoctor: formFields.referralDoctor,
        parsedDemographics: JSON.stringify(formFields),
        templateContext: JSON.stringify(fullContext),
        reportBody,
      },
    });

    return NextResponse.json({
      id: dischargeReport.id,
      templateId: dischargeReport.templateId,
      patientName: dischargeReport.patientName,
      reportBody: dischargeReport.reportBody,
      createdAt: dischargeReport.createdAt,
    });
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return NextResponse.json(
      { error: "Failed to create discharge report" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/reports
 * 
 * Query params:
 * - limit: number (default 20)
 * - offset: number (default 0)
 * - patientName: string (filter)
 * 
 * Returns: { reports: DischargeReport[], total: number }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const patientNameFilter = searchParams.get("patientName");

    const where: any = {};
    if (patientNameFilter) {
      where.patientName = {
        contains: patientNameFilter,
      };
    }

    const [reports, total] = await Promise.all([
      prisma.dischargeReport.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.dischargeReport.count({ where }),
    ]);

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        templateId: r.templateId,
        patientName: r.patientName,
        hioCode: r.hioCode,
        createdAt: r.createdAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch discharge reports" },
      { status: 500 },
    );
  }
}
