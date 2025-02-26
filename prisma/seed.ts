import { PrismaClient } from '@prisma/client';
import users from './seeders/users.json';
import userDetails from './seeders/userDetails.json';
import tokenSessions from './seeders/tokenSessions.json';

const prisma = new PrismaClient();

async function main() {
  for (const user of users) {
    await prisma.users.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }
  for (const details of userDetails) {
    await prisma.userDetails.upsert({
      where: { user_id: details.user_id },
      update: {},
      create: details,
    });
  }
  for (const sessions of tokenSessions) {
    await prisma.tokenSessions.upsert({
      where: { id: sessions.id },
      update: {},
      create: sessions
    });
  }
}

main().then((result) => {
    console.log('[🚀] All seeds successfully done!')
})
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
