const router = require('koa-router')()
const userController = require('../controller/user')

const { getAllUsers, getUserById } = require('../dao/index')

router.get('/', async(ctx, next) => {
  ctx.body = {
    data: {
      'name': 'defore',
      'greeting': 'Welcome to defore\'s api'
    }
  }
})

// 获取所有用户列表
router.get('users', async(ctx, next) => {
  await getAllUsers()
    .then((rows) => {
      ctx.body = {
        data: {
          list: rows
        },
        success: true
      }
    })
    .catch((err) => {
      ctx.body = {
        data: {},
        success: false
      }
    })
})

// 获取单一用户
router.get('users/:id', async(ctx, next) => {
  const id = ctx.params.id
  await getUserById([id])
    .then((rows) => {
      ctx.body = {
        data: {},
        success: true
      }
      if (rows.length === 1) {
        ctx.body = {
          data: rows[0]
        }
      }
    })
    .catch((err) => {
      ctx.body = {
        data: {},
        success: false
      }
    })
})

// 登录
router.post('login', async (ctx, next) => {
  ctx.body = await userController.login(ctx, next)
})

// 登出
router.get('logout', async (ctx, next) => {
  ctx.body = await userController.logout(ctx, next)
})

module.exports = router
