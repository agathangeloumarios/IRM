-- CreateTable
CREATE TABLE "DischargeReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "hioCode" TEXT NOT NULL DEFAULT '',
    "idPassportNo" TEXT NOT NULL DEFAULT '',
    "hospitalId" TEXT NOT NULL DEFAULT '',
    "dateOfBirth" TEXT NOT NULL DEFAULT '',
    "occupation" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "referralDoctor" TEXT NOT NULL DEFAULT '',
    "parsedDemographics" TEXT,
    "templateContext" TEXT,
    "reportBody" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
