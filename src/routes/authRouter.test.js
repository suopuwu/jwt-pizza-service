const request = require('supertest')
const app = require('../service')

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' }
let testUserAuthToken

beforeAll(async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com'
    const registerRes = await request(app).post('/api/auth').send(testUser)
    testUserAuthToken = registerRes.body.token
    expectValidJwt(testUserAuthToken)
})
test('fail login', async () => {
    const loginRes = await request(app)
        .put('/api/auth')
        .send({ name: 'pizza disddsfner', email: 'reg@testsdffsd.com', password: 'asdfsfd' })
    expect(loginRes.status).toBe(404)
})

test('login', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser)
    expect(loginRes.status).toBe(200)
    expectValidJwt(loginRes.body.token)

    const expectedUser = { ...testUser, roles: [{ role: 'diner' }] }
    delete expectedUser.password
    expect(loginRes.body.user).toMatchObject(expectedUser)
})

test('fail update user', async () => {
    const logoutRes = await request(app).put('/api/auth/:lsdkj')
    expect(logoutRes.status).toBe(401)
})

test('logout', async () => {
    const logoutRes = await request(app).delete('/api/auth').set('authorization', testUserAuthToken)
    expect(logoutRes.status).toBe(200)
})

function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/)
}
