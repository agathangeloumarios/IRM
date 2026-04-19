/**
 * Plain types shared between the client store and server-side code (e.g. seeds).
 * No React or client-only deps live here.
 */

export type TemplateCategory = "consultation" | "discharge";

export interface TemplateChrome {
  titleOverride?: string;
  accentColor?: string;
  practiceName?: string;
  practiceAddress?: string;
  practicePhone?: string;
  practiceEmail?: string;
  practiceLogoText?: string;
  practiceLogoDataUrl?: string;
  doctorName?: string;
  doctorTitles?: string;
  doctorLicense?: string;
  signatureText?: string;
  signatureImageDataUrl?: string;
  footerLeft?: string;
  footerRight?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  showSignature?: boolean;
  showLogo?: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  source: "seed" | "custom" | "upload";
  originalFileName?: string;
  chrome?: TemplateChrome;
  currentVersion?: number;
}
