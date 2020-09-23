const router = require('koa-router')()
const userController = require('../controller/user')

router.get('/', async (ctx, next) => {
  ctx.body = await userController.getAllUsers(ctx, next)
})

router.get('/:id', async (ctx, next) => {
  ctx.body = await userController.getUserById(ctx, next)
})

router.post('/', async (ctx, next) => {
  ctx.body = await userController.createUser(ctx, next)
})

router.put('/:id', async (ctx, next) => {
  ctx.body = await userController.updateUser(ctx, next)
})

router.get('/delete/:username', async (ctx, next) => {
  ctx.body = await userController.deleteUser(ctx, next)
})

module.exports = router
