import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Vitarantracker API (e2e)', () => {
  let app: INestApplication;
  const prisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    isDatabaseConnected: jest.fn().mockResolvedValue(true),
    admin: { findUnique: jest.fn(), findFirst: jest.fn() },
    device: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports database connectivity', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      database: 'connected',
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it('GET /api/health is unhealthy when PostgreSQL is unavailable', async () => {
    prisma.isDatabaseConnected.mockResolvedValueOnce(false);
    const response = await request(app.getHttpServer()).get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body.database).toBe('disconnected');
  });

  it('rejects tracker events that include unsupported privacy-sensitive fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tracker/events')
      .send({
        eventId: 'evt-privacy',
        eventType: 'KEY_PRESSED',
        occurredAt: '2026-09-10T09:00:00.000Z',
        typedText: 'secret password',
        screenshot: 'base64',
        clipboard: 'copied',
        url: 'https://example.com',
        fileName: 'payroll.xlsx',
        mouseX: 12,
        mouseY: 40,
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body.success).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain('secret password');
  });

  it('rejects device registration payloads that try to set a non-Windows OS', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/devices/register')
      .send({
        employeeId: 'EMP001',
        registrationCode: 'AB7K-92PX',
        deviceName: 'VITARAN-LAPTOP-001',
        hostname: 'RAHUL-PC',
        agentVersion: '1.0.0',
        operatingSystem: 'MACOS',
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });
});
