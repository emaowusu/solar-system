process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

jest.mock('../src/models/User');
jest.mock('../src/redis', () => ({ get: jest.fn(), set: jest.fn(), on: jest.fn() }));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const redis = require('../src/redis');
const app = require('../src/app');

const creds = { name: 'Ada', email: 'ada@example.com', password: 'supersecret1' };

describe('auth', () => {
  test('signup creates a user and returns a token', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (d) => ({ _id: 'u1', ...d }));
    const res = await request(app).post('/api/auth/signup').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toEqual({ id: 'u1', name: 'Ada', email: 'ada@example.com' });
  });

  test('signup rejects short passwords and bad emails', async () => {
    expect((await request(app).post('/api/auth/signup').send({ ...creds, password: 'short' })).status).toBe(400);
    expect((await request(app).post('/api/auth/signup').send({ ...creds, email: 'nope' })).status).toBe(400);
  });

  test('signup rejects duplicate emails', async () => {
    User.findOne.mockResolvedValue({ _id: 'u1' });
    expect((await request(app).post('/api/auth/signup').send(creds)).status).toBe(409);
  });

  test('signin succeeds with correct password, fails with wrong one', async () => {
    User.findOne.mockResolvedValue({ _id: 'u1', name: 'Ada', email: creds.email, passwordHash: await bcrypt.hash(creds.password, 4) });
    expect((await request(app).post('/api/auth/signin').send({ email: creds.email, password: creds.password })).status).toBe(200);
    expect((await request(app).post('/api/auth/signin').send({ email: creds.email, password: 'wrongpass' })).status).toBe(401);
  });

  test('signin fails for unknown user', async () => {
    User.findOne.mockResolvedValue(null);
    expect((await request(app).post('/api/auth/signin').send({ email: 'x@y.co', password: 'whatever12' })).status).toBe(401);
  });
});

describe('planets (protected)', () => {
  const login = async () => {
    User.findOne.mockResolvedValue({ _id: 'u1', name: 'Ada', email: creds.email, passwordHash: await bcrypt.hash(creds.password, 4) });
    const res = await request(app).post('/api/auth/signin').send({ email: creds.email, password: creds.password });
    return res.body.token;
  };

  test('requires authentication', async () => {
    expect((await request(app).get('/api/planets')).status).toBe(401);
    expect((await request(app).get('/api/planets').set('Authorization', 'Bearer bad')).status).toBe(401);
  });

  test('returns planets and caches them in redis', async () => {
    const token = await login();
    redis.get.mockResolvedValue(null);
    const res = await request(app).get('/api/planets').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.planets.map((p) => p.id)).toEqual(['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
    expect(redis.set).toHaveBeenCalledWith('planets:all', expect.any(String), 'EX', 3600);
  });

  test('single planet lookup and 404', async () => {
    const token = await login();
    redis.get.mockResolvedValue(null);
    const ok = await request(app).get('/api/planets/earth').set('Authorization', `Bearer ${token}`);
    expect(ok.body.planet.name).toBe('Earth');
    expect((await request(app).get('/api/planets/pluto').set('Authorization', `Bearer ${token}`)).status).toBe(404);
  });

  test('signed-out tokens are rejected via redis blacklist', async () => {
    const token = await login();
    redis.get.mockResolvedValue('1');
    expect((await request(app).get('/api/planets').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  test('signout blacklists the token', async () => {
    const token = await login();
    redis.get.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/signout').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(redis.set).toHaveBeenCalledWith(`bl:${token}`, '1', 'EX', expect.any(Number));
  });
});
