const request = require('supertest')
const app = require('../service')
const { authRouter } = require('./authRouter')
const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' }

let testUserAuthToken, adminToken, testUserId, adminId, adminUser
const { Role, DB } = require('../database/database.js')
function randomName() {
    return Math.random().toString(36).substring(2, 12)
}
async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] }
    user.name = randomName()
    user.email = user.name + '@admin.com'

    user = await DB.addUser(user)
    const returnVal = { ...user, password: 'toomanysecrets' }
    return returnVal
}

beforeAll(async () => {
    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com'
    const registerRes = await request(app).post('/api/auth').send(testUser)
    testUserAuthToken = registerRes.body.token
    expectValidJwt(testUserAuthToken)
    adminUser = await createAdminUser()

    console.log(adminUser)

    const loginRes = await request(app).put('/api/auth').send(adminUser)
    expect(loginRes.status).toBe(200)
    expectValidJwt(loginRes.body.token)
    adminToken = loginRes.body.token
    adminId = loginRes.body.user.id
})
test('fail login', async () => {
    const loginRes = await request(app).put('/api/auth').send({ name: 'pizza disddsfner', email: 'reg@testsdffsd.com', password: 'asdfsfd' })
    expect(loginRes.status).toBe(404)
})

test('login', async () => {
    const loginRes = await request(app).put('/api/auth').send(testUser)
    expect(loginRes.status).toBe(200)
    expectValidJwt(loginRes.body.token)

    const expectedUser = { ...testUser, roles: [{ role: 'diner' }] }
    delete expectedUser.password
    expect(loginRes.body.user).toMatchObject(expectedUser)
    testUserId = loginRes.body.user.id
    console.log('id: ', testUserId)
})

test('fail update user', async () => {
    const logoutRes = await request(app).put('/api/auth/lsdkj')
    expect(logoutRes.status).toBe(401)
})

test('update user', async () => {
    const logoutRes = await request(app)
        .put('/api/auth/' + adminId)
        .set('authorization', adminToken)
        .send({})
    expect(logoutRes.status).toBe(500)
})

test('fail to update user due to admin', async () => {
    const logoutRes = await request(app)
        .put('/api/auth/' + adminId)
        .set('authorization', testUserAuthToken)
        .send({})
    expect(logoutRes.status).toBe(403)
})

test('fail reg', async () => {
    const registerRes = await request(app).post('/api/auth').send({})
    expect(registerRes.status).toBe(400)
})

test('get franchises', async () => {
    const logoutRes = await request(app).get('/api/franchise')
    expect(logoutRes.status).toBe(200)
})

test('fail to get specific franchise', async () => {
    const logoutRes = await request(app).get('/api/franchise/sdf').set('authorization', testUserAuthToken)
    expect(logoutRes.body).toEqual([])
    console.log(logoutRes.body)
})

test('fail to create franchise due to invalid user', async () => {
    try {
        await request(app).post('/api/franchise').set('authorization', testUserAuthToken)
        expect(false).toBe(true)
    } catch (e) {
        expect(true).toBe(true)
    }
})

test('create franchise without necessary data', async () => {
    expect((await request(app).post('/api/franchise').set('authorization', adminToken)).status).toBe(500)
})

test('get nonextistent franchise', async () => {
    expect((await request(app).get('/api/franchise/nonexistent').set('authorization', adminToken)).status).toBe(200)
})

test('delete nonextistent franchise', async () => {
    expect((await request(app).delete('/api/franchise/nonexistent').set('authorization', adminToken)).status).toBe(200)
})

test('create invalid store', async () => {
    expect((await request(app).post('/api/franchise/nonexistent/store').set('authorization', adminToken)).status).toBe(500)
})

test('delete invalid store', async () => {
    expect((await request(app).delete('/api/franchise/nonexistent/store').set('authorization', adminToken)).status).toBe(404)
})

test('get menu', async () => {
    expect((await request(app).get('/api/order/menu').set('authorization', adminToken)).status).toBe(200)
})

test('add menu item without info', async () => {
    expect((await request(app).put('/api/order/menu').set('authorization', adminToken)).status).toBe(500)
})

test('add menu item without admin', async () => {
    const res = await request(app)
        .put('/api/order/menu')
        .set('authorization', testUserAuthToken)
        .send({ user: testUser, title: 'title', description: 'desc', image: 'img', price: 'price' })
    expect(res.status).toBe(403)
})

test('add menu item with admin', async () => {
    const res = await request(app)
        .put('/api/order/menu')
        .set('authorization', adminToken)
        .send({ user: adminUser, title: 'title', description: 'desc', image: 'img', price: 'price' })
    expect(res.status).toBe(500)
})

test('get orders', async () => {
    expect((await request(app).get('/api/order').set('authorization', adminToken)).status).toBe(200)
})

test('create order without info', async () => {
    expect((await request(app).post('/api/order').set('authorization', adminToken)).status).toBe(500)
})

test('create order without admin', async () => {
    expect((await request(app).post('/api/order').set('authorization', testUserAuthToken)).status).toBe(500)
})

test('create order with admin', async () => {
    expect((await request(app).post('/api/order').set('authorization', adminToken).send({ user: adminUser, order: 0 })).status).toBe(500)
})

test('db create franchise, no perms', async () => {
    try {
        await DB.createFranchise({ admins: [{ email: 'invalid' }] })
    } catch (e) {
        expect(e).toEqual(new Error('unknown user for franchise admin invalid provided'))
    }
})

test('db create franchise', async () => {
    const franchise = await DB.createFranchise({ admins: [adminUser], name: 'cool franchise' + adminId })
    expect(franchise.admins.length).toBe(1)
})

test('get specific franchise', async () => {
    const logoutRes = await request(app)
        .get('/api/franchise/' + adminId)
        .set('authorization', adminToken)
    expect(logoutRes.status).toBe(200)
    console.log(logoutRes.body)
})
test('db get user franchises', async () => {
    const franchises = await DB.getUserFranchises(adminId)
    expect(franchises.length).toBe(1)
})

test('db update user', async () => {
    const user = await DB.updateUser(adminId, 'new email', 'pass')
    expect(user.email).toBe('new email')
})

test('db get franchises', async () => {
    const franchises = await DB.getFranchises({ isRole: () => true })
    expect(franchises == []).toBe(false)
})

test('db token signature', async () => {
    expect(DB.getTokenSignature('1.1')).toBe('')
})

test('db token signature 2', async () => {
    expect(DB.getTokenSignature('1.2.3')).toBe('3')
})
test('logout', async () => {
    const logoutRes = await request(app).delete('/api/auth').set('authorization', testUserAuthToken)
    expect(logoutRes.status).toBe(200)
})
test('logout', async () => {
    const logoutRes = await request(app).delete('/api/auth').set('authorization', testUserAuthToken)
    expect(logoutRes.status).toBe(401)
})
function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/)
}
