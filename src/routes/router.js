const router = require('koa-router')()
const index = require('./index')
const user = require('./user')

router.use('/', index.routes(), index.allowedMethods())
router.use('/user', user.routes(), user.allowedMethods())

module.exports = router
