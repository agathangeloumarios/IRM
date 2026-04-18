import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PatientProvider } from "@/lib/patient-store";
import { TemplateProvider } from "@/lib/template-store";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "IRM · Interventional Radiology EHR",
    template: "%s · IRM",
  },
  description:
    "HIPAA-compliant EHR and practice management platform designed for interventional radiology solo practitioners.",
  keywords: [
    "interventional radiology", "EHR", "HIPAA", "practice management",
    "IR procedures", "discharge report", "medical imaging",
  ],
  authors: [{ name: "IRM Health" }],
  robots: { index: false, follow: false },
  openGraph: {
    title: "IRM · Interventional Radiology EHR",
    description: "Clean, minimal, HIPAA-compliant EHR for solo IR practices.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#181614",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <TooltipProvider delayDuration={200}>
          <PatientProvider>
            <TemplateProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground"
            >
              Skip to main content
            </a>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Topbar />
                <main id="main" className="flex-1">
                  {children}
                </main>
              </div>
            </div>
            </TemplateProvider>
          </PatientProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
