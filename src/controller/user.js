const userDao = require('../dao/user')
const createJSON = require('../utils/api')

// 获取用户列表
const getAllUsers = async (ctx, next) => {
  try {
    let userList = await userDao.getAllUsers()
    return createJSON({
      data: userList
    })
  } catch (err) {
    return createJSON({
      success: false,
      msg: err
    })
  }
}

// 获取单个用户数据
const getUserById = async (ctx, next) => {
  try {
    const id = ctx.params.id
    let user = await userDao.getUserById([id])
    if (Array.isArray(user)) {
      user = user.length === 1 ? user[0] : user
    }
    return createJSON({
      data: user
    })
  } catch (err) {
    return createJSON({
      success: false,
      msg: err
    })
  }
}

module.exports = {
  getAllUsers,
  getUserById
}
