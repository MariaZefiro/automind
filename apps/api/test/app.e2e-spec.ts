import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('API integration (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-only-secret-that-is-never-used-outside-tests';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => app?.close());

  it('serves health check through the HTTP adapter', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
  });

  it('rejects invalid login input with the standard error envelope', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'invalid', password: 'short' }).expect(400);
    expect(response.body).toMatchObject({ statusCode: 400, error: 'BAD_REQUEST' });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });
});
