import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [admin, manager, operator] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@robotfleet.dev' },
      update: {},
      create: { name: 'Alice Admin', email: 'admin@robotfleet.dev', passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'manager@robotfleet.dev' },
      update: {},
      create: { name: 'Mia Manager', email: 'manager@robotfleet.dev', passwordHash, role: 'MANAGER', status: 'ACTIVE' },
    }),
    prisma.user.upsert({
      where: { email: 'operator@robotfleet.dev' },
      update: {},
      create: { name: 'Oscar Operator', email: 'operator@robotfleet.dev', passwordHash, role: 'OPERATOR', status: 'ACTIVE' },
    }),
  ]);

  await prisma.user.upsert({
    where: { email: 'viewer@robotfleet.dev' },
    update: {},
    create: { name: 'Vera Viewer', email: 'viewer@robotfleet.dev', passwordHash, role: 'VIEWER', status: 'ACTIVE' },
  });

  await prisma.user.upsert({
    where: { email: 'suspended@robotfleet.dev' },
    update: {},
    create: { name: 'Sam Suspended', email: 'suspended@robotfleet.dev', passwordHash, role: 'OPERATOR', status: 'SUSPENDED' },
  });

  const team = await prisma.team.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Warehouse Alpha',
      description: 'Primary warehouse operations team',
      leaderId: manager.id,
      status: 'ACTIVE',
    },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: operator.id } },
    update: {},
    create: { teamId: team.id, userId: operator.id },
  });

  const robotSeeds = [
    { serialNumber: 'RX200-001', name: 'Ranger One', model: 'RX-200', status: 'AVAILABLE' as const, batteryLevel: 92 },
    { serialNumber: 'RX200-002', name: 'Ranger Two', model: 'RX-200', status: 'RUNNING' as const, batteryLevel: 65 },
    { serialNumber: 'RX200-003', name: 'Ranger Three', model: 'RX-200', status: 'MAINTENANCE' as const, batteryLevel: 40 },
    { serialNumber: 'RX300-001', name: 'Sentinel One', model: 'RX-300', status: 'OFFLINE' as const, batteryLevel: 100 },
    { serialNumber: 'RX300-002', name: 'Sentinel Two', model: 'RX-300', status: 'ERROR' as const, batteryLevel: 15 },
    { serialNumber: 'RX300-003', name: 'Sentinel Three', model: 'RX-300', status: 'RETIRED' as const, batteryLevel: 5 },
  ];

  const robots = [];
  for (const seed of robotSeeds) {
    const robot = await prisma.robot.upsert({
      where: { serialNumber: seed.serialNumber },
      update: {},
      create: { ...seed, teamId: team.id, lastSeenAt: new Date() },
    });
    robots.push(robot);
  }

  await prisma.telemetry.createMany({
    data: robots.map((robot) => ({
      robotId: robot.id,
      batteryLevel: robot.batteryLevel,
      temperature: 35.5,
      latitude: -23.55,
      longitude: -46.63,
      speed: 1.2,
    })),
  });

  const job1 = await prisma.job.upsert({
    where: { id: '00000000-0000-0000-0000-000000000101' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000101',
      title: 'Inventory scan - Aisle 5',
      description: 'Scan shelves for inventory reconciliation.',
      priority: 'MEDIUM',
      status: 'RUNNING',
      robotId: robots[1].id,
      createdBy: manager.id,
      startedAt: new Date(),
    },
  });

  await prisma.job.upsert({
    where: { id: '00000000-0000-0000-0000-000000000102' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000102',
      title: 'Pending pickup - Dock 2',
      priority: 'HIGH',
      status: 'CREATED',
      createdBy: operator.id,
    },
  });

  await prisma.maintenance.upsert({
    where: { id: '00000000-0000-0000-0000-000000000201' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000201',
      robotId: robots[2].id,
      type: 'PREVENTIVE',
      description: 'Quarterly battery inspection',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      performedBy: manager.id,
    },
  });

  await prisma.incident.upsert({
    where: { id: '00000000-0000-0000-0000-000000000301' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000301',
      robotId: robots[4].id,
      jobId: job1.id,
      type: 'SENSOR_FAILURE',
      severity: 'CRITICAL',
      description: 'Robot reported a critical sensor failure during operation.',
      status: 'OPEN',
    },
  });

  await prisma.notification.upsert({
    where: { id: '00000000-0000-0000-0000-000000000401' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000401',
      userId: admin.id,
      type: 'CRITICAL',
      title: 'Critical incident reported',
      message: 'Sentinel Two reported a critical sensor failure.',
    },
  });

  console.log('Seed completed. Demo users password: ' + DEMO_PASSWORD);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
