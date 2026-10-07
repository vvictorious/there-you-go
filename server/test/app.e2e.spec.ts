import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module';
import { PLACES_PROVIDER, PlacesProvider } from '../src/places/places-provider';

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  const search = vi.fn<PlacesProvider['search']>();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PLACES_PROVIDER)
      .useValue({ search } satisfies PlacesProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('POST /places/candidates returns mapped candidates', async () => {
    search.mockResolvedValueOnce([
      {
        id: 'market-1',
        name: 'Neighborhood Market',
        location: { latitude: 34.001, longitude: -118.401 },
      },
    ]);

    const response = await request(app.getHttpServer())
      .post('/places/candidates')
      .send({
        reminders: [{ id: 'reminder-1', text: 'Milk' }],
        location: { latitude: 34, longitude: -118.4 },
      })
      .expect(200);

    expect(response.body).toEqual({
      results: [
        {
          reminderId: 'reminder-1',
          candidates: [
            {
              id: 'market-1',
              name: 'Neighborhood Market',
              location: { latitude: 34.001, longitude: -118.401 },
            },
          ],
        },
      ],
      unsupportedReminderIds: [],
    });
    expect(search).toHaveBeenCalledWith({
      categories: ['grocery-store'],
      location: { latitude: 34, longitude: -118.4 },
    });
  });

  it('returns unsupported reminders without searching', async () => {
    search.mockClear();

    await request(app.getHttpServer())
      .post('/places/candidates')
      .send({
        reminders: [{ id: 'reminder-1', text: 'Bread' }],
        location: { latitude: 34, longitude: -118.4 },
      })
      .expect(200)
      .expect({
        results: [],
        unsupportedReminderIds: ['reminder-1'],
      });

    expect(search).not.toHaveBeenCalled();
  });

  it.each([
    { reminders: [], location: { latitude: 34, longitude: -118.4 } },
    {
      reminders: [{ id: '', text: 'Milk' }],
      location: { latitude: 34, longitude: -118.4 },
    },
    {
      reminders: [{ id: 'reminder-1', text: '' }],
      location: { latitude: 34, longitude: -118.4 },
    },
    {
      reminders: [{ id: 'reminder-1', text: 'Milk' }],
      location: { latitude: 90.1, longitude: -118.4 },
    },
    {
      reminders: [{ id: 'reminder-1', text: 'Milk' }],
      location: { latitude: 34, longitude: 180.1 },
    },
  ])('rejects invalid candidate input', async (body) => {
    await request(app.getHttpServer())
      .post('/places/candidates')
      .send(body)
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
