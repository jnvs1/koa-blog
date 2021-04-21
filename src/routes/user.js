const router = require('koa-router')()
const userController = require('../controller/user')

router.get('/', async (ctx, next) => {
  ctx.body = await userController.getAllUsers(ctx, next)
})

router.get('/:id', async (ctx, next) => {
  ctx.body = await userController.getUserById(ctx, next)
})

module.exports = router
