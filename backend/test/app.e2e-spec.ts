import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'

describe('AppModule (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health returns ok', async () => {
    const response = await request(app.getHttpServer()).get('/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('GraphQL query health returns ok', async () => {
    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ health }' })
    expect(response.status).toBe(200)
    expect(response.body.data.health).toBe('ok')
  })
})
