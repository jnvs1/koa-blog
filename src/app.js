const Koa = require('koa')
const logger = require('koa-logger')
const json = require('koa-json')
const views = require('koa-views')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const cors = require('koa2-cors')
const jwt = require('koa-jwt')

const { secret } = require('./utils/config')
const router = require('./routes/router')

const app = new Koa()

// error handler
onerror(app)

// middlewares
app.use(views('views', {
  root: __dirname + '/views',
  default: 'pug',
  extension: 'pug'
}))
app.use(bodyparser({
  enableTypes: ['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

app.use(async (ctx, next) => {
  try {
    console.log(this)
    await next()
  } catch (err) {
    if (401 === err.status) {
      ctx.status = 401
      ctx.body = {
        success: true,
        token: null,
        msg: 'token验证失败'
      }
    } else {
      throw err
    }
  }
})

// cors
app.use(cors())

// jwt
app.use(jwt({ secret: secret }).unless({ path: [/\/register/, /\/login/] }))

// routes
app.use(router.routes(), router.allowedMethods())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});

module.exports = app
