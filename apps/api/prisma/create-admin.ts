import { hash } from 'argon2';
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.');
  }

  const prisma = new PrismaClient();
  try {
    const email = ADMIN_EMAIL.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new Error('A user with this email already exists; bootstrap never changes existing accounts.');
    }
    const passwordHash = await hash(ADMIN_PASSWORD, { type: 2 });
    await prisma.user.create({ data: { name: ADMIN_NAME, email, passwordHash, role: 'ADMIN' } });
    console.info(`Administrator created: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Administrator bootstrap failed.');
  process.exitCode = 1;
});