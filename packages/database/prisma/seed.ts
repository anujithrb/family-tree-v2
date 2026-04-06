import { PrismaClient } from '@prisma/client';
import { generateProfileId } from '../src/profile-id';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function checkExists(profileId: string): Promise<boolean> {
  const count = await prisma.person.count({ where: { profileId } });
  return count > 0;
}

async function main() {
  console.log('Seeding database...');

  // Create back-office admin (password: "admin123" — dev only)
  const passwordHash = await bcryptjs.hash('admin123', 12);
  const adminUser = await prisma.adminUser.upsert({
    where: { email: 'admin@familytree.local' },
    update: {},
    create: {
      email: 'admin@familytree.local',
      name: 'Platform Admin',
      passwordHash,
      otpEnabled: false,
    },
  });
  console.log(`  Admin user: ${adminUser.email} (id: ${adminUser.id})`);

  // Create a demo community with a 3-generation family
  const community = await prisma.community.upsert({
    where: { id: 'demo-community-seed' },
    update: {},
    create: {
      id: 'demo-community-seed',
      name: 'The Rajan Family',
    },
  });
  console.log(`  Community: ${community.name} (id: ${community.id})`);

  // Create persons
  const persons = [
    { name: 'Arjun Rajan', birthYear: 1940, deathYear: 1998, isDeceased: true, gender: 'M' },
    { name: 'Priya Rajan', birthYear: 1943, gender: 'F' },
    { name: 'Rahul Rajan', birthYear: 1965, gender: 'M' },
    { name: 'Anita Rajan', birthYear: 1968, gender: 'F' },
    { name: 'Vikram Rajan', birthYear: 1990, gender: 'M' },
    { name: 'Meera Rajan', birthYear: 1992, gender: 'F' },
    { name: 'Sanjay Rajan', birthYear: 1967, gender: 'M' },
    { name: 'Deepa Rajan', birthYear: 1970, gender: 'F' },
    { name: 'Rohan Rajan', birthYear: 1993, gender: 'M' },
  ];

  const createdPersons: Record<string, { id: string; name: string }> = {};
  for (const p of persons) {
    const profileId = await generateProfileId(p.name, checkExists);
    const person = await prisma.person.upsert({
      where: { profileId },
      update: {},
      create: {
        profileId,
        name: p.name,
        birthYear: p.birthYear,
        deathYear: p.deathYear ?? null,
        isDeceased: p.isDeceased ?? false,
        gender: p.gender,
      },
    });
    createdPersons[p.name] = { id: person.id, name: person.name };
    console.log(`  Person: ${person.name} (@${person.profileId})`);
  }

  // Create tree nodes
  const treeNodes: Record<string, string> = {};
  for (const [name, person] of Object.entries(createdPersons)) {
    const node = await prisma.treeNode.upsert({
      where: {
        communityId_personId: {
          communityId: community.id,
          personId: person.id,
        },
      },
      update: {},
      create: {
        communityId: community.id,
        personId: person.id,
      },
    });
    treeNodes[name] = node.id;
  }
  console.log(`  Created ${Object.keys(treeNodes).length} tree nodes`);

  // Create couples
  // Root couple: Arjun & Priya (gen 0)
  const rootCouple = await prisma.couple.upsert({
    where: { spouse1Id: treeNodes['Arjun Rajan'] },
    update: {},
    create: {
      communityId: community.id,
      spouse1Id: treeNodes['Arjun Rajan'],
      spouse2Id: treeNodes['Priya Rajan'],
      status: 'widowed',
    },
  });

  // Gen 1: Rahul & Anita
  const couple1 = await prisma.couple.upsert({
    where: { spouse1Id: treeNodes['Rahul Rajan'] },
    update: {},
    create: {
      communityId: community.id,
      spouse1Id: treeNodes['Rahul Rajan'],
      spouse2Id: treeNodes['Anita Rajan'],
    },
  });

  // Gen 1: Sanjay & Deepa
  const couple2 = await prisma.couple.upsert({
    where: { spouse1Id: treeNodes['Sanjay Rajan'] },
    update: {},
    create: {
      communityId: community.id,
      spouse1Id: treeNodes['Sanjay Rajan'],
      spouse2Id: treeNodes['Deepa Rajan'],
    },
  });
  console.log('  Created 3 couples');

  // Create parent-child relationships
  // Arjun & Priya → Rahul, Sanjay
  await prisma.coupleChild.upsert({
    where: { coupleId_childId: { coupleId: rootCouple.id, childId: treeNodes['Rahul Rajan'] } },
    update: {},
    create: { coupleId: rootCouple.id, childId: treeNodes['Rahul Rajan'], sortOrder: 0 },
  });
  await prisma.coupleChild.upsert({
    where: { coupleId_childId: { coupleId: rootCouple.id, childId: treeNodes['Sanjay Rajan'] } },
    update: {},
    create: { coupleId: rootCouple.id, childId: treeNodes['Sanjay Rajan'], sortOrder: 1 },
  });

  // Rahul & Anita → Vikram, Meera
  await prisma.coupleChild.upsert({
    where: { coupleId_childId: { coupleId: couple1.id, childId: treeNodes['Vikram Rajan'] } },
    update: {},
    create: { coupleId: couple1.id, childId: treeNodes['Vikram Rajan'], sortOrder: 0 },
  });
  await prisma.coupleChild.upsert({
    where: { coupleId_childId: { coupleId: couple1.id, childId: treeNodes['Meera Rajan'] } },
    update: {},
    create: { coupleId: couple1.id, childId: treeNodes['Meera Rajan'], sortOrder: 1 },
  });

  // Sanjay & Deepa → Rohan
  await prisma.coupleChild.upsert({
    where: { coupleId_childId: { coupleId: couple2.id, childId: treeNodes['Rohan Rajan'] } },
    update: {},
    create: { coupleId: couple2.id, childId: treeNodes['Rohan Rajan'], sortOrder: 0 },
  });
  console.log('  Created 5 parent-child relationships');

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
