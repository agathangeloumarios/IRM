/**
 * Prisma seed for the IRM app.
 *
 * Runs once on an empty database:
 *   - Inserts the four canonical Greek report templates (consultation/discharge).
 *
 * It is *conditional*: if any templates already exist, this script does nothing.
 * Patients are never seeded — those come from XML imports only.
 *
 * Run with:
 *   npx tsx prisma/seed.ts
 * or:
 *   npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import { SEED_TEMPLATES } from "../src/lib/template-seeds";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.template.count();
  if (existing > 0) {
    console.log(`[seed] ${existing} template(s) already present — skipping.`);
    return;
  }

  let order = 0;
  for (const t of SEED_TEMPLATES) {
    await prisma.template.create({
      data: {
        id: t.id,
        name: t.name,
        category: t.category,
        body: t.body,
        locked: t.locked,
        source: t.source,
        originalFileName: t.originalFileName ?? null,
        chromeJson: t.chrome ? JSON.stringify(t.chrome) : null,
        orderIndex: order++,
        currentVersion: 1,
        versions: {
          create: [
            {
              version: 1,
              name: t.name,
              body: t.body,
              chromeJson: t.chrome ? JSON.stringify(t.chrome) : null,
              reason: "seed",
            },
          ],
        },
      },
    });
  }
  console.log(`[seed] inserted ${SEED_TEMPLATES.length} template(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
