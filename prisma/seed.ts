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
    }).then((result) => console.log(`[📦] "users" seeds inserted: ${JSON.stringify(result)}`));
  }
  for (const details of userDetails) {
    await prisma.userDetails.upsert({
      where: { user_id: details.user_id },
      update: {},
      create: details,
    }).then((result) => console.log(`[📦] "userDetails" seeds inserted: ${JSON.stringify(result)}`));
  }
  for (const sessions of tokenSessions) {
    await prisma.tokenSessions.upsert({
      where: { id: sessions.id },
      update: {},
      create: sessions
    }).then((result) => console.log(`[📦] "tokenSessions" seeds inserted: ${JSON.stringify(result)}`));
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
