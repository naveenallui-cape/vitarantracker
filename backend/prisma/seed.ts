import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      'ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set before seeding.',
    );
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.admin.findFirst({
    orderBy: { createdAt: 'asc' },
  });

  if (existing) {
    await prisma.admin.update({
      where: { id: existing.id },
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        isActive: true,
      },
    });
    return;
  }

  await prisma.admin.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      isActive: true,
    },
  });
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Seed failed';
    console.error(message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
