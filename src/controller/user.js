const userDao = require('../dao/user')
const createJSON = require('../utils/api')
const base64 = require('base-64')
const jsonwebtoken = require('jsonwebtoken')
const { secret } = require('../utils/config')

// 获取用户列表
const getAllUsers = async (ctx, next) => {
  try {
    let userList = await userDao.getAllUsers()
    userList.map(item => {
      item.password = ""
    })
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

// 根据条件获取用户数据
const getUsers = async (ctx, next) => {
  try {
    const { username } = ctx.request.body
    const user = await userDao.getUsers([username])
    return user
  } catch (err) {
    return createJSON({
      success: false,
      msg: err
    })
  }
}

// 创建用户
const createUser = async (ctx, next) => {
  try {
    // 1.判断是否存在该用户
    let user = await getUsers(ctx, next)
    let response = {}
    if (user.length > 0) {
      response = createJSON({
        data: {
          created: true,
        },
        msg: '用户已存在'
      })
    } else {
      // 2.创建
      let { username, password, age } = ctx.request.body
      age = age || 0
      user = await userDao.createUser([username, password, age])
      response = createJSON({
        data: {
          created: true,
        },
        msg: '创建用户成功'
      })
    }
    return response
  } catch (err) {
    return createJSON({
      success: false,
      msg: err
    })
  }
}

const updateUser = async (ctx, next) => {
  try {
    return createJSON({
      data: ctx.params,
      msg: '更新',
    })
  } catch (err) {
    return createJSON({
      success: false,
      msg: err
    })
  }
}

// 删除用户
const deleteUser = async (ctx, next) => {
  try {
    const { username } = ctx.params
    let result = userDao.deleteUser([username])
    return createJSON({
      data: result,
      msg: '删除成功',
    })
  } catch (err) {
    return createJSON({
      success: false,
      msg: err
    })
  }
}

// 用户登录
const login = async (ctx, next) => {
  try {
    const { username, password } = ctx.request.body
    let result = {}
    let user = await userDao.getUsers([username])
    if (user.length) {
      user = user[0]
      if (password === user.password) {
        // TODO 登录并且将用户保存在cookie中
        const userToken = {
          username,
          // exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1hour
        }
        const token = jsonwebtoken.sign(userToken, secret)
        result = createJSON({
          data: {
            login: true,
            token,
          },
          msg: '登录成功'
        })
      } else {
        result = createJSON({
          data: {
            login: false
          },
          msg: '密码错误'
        })
      }
    } else {
      result = createJSON({
        data: {
          login: false
        },
        msg: '用户不存在'
      })
    }
    return result
  } catch (err) {
    return createJSON({
      success: false,
      msg: err
    })
  }
}

// 用户登录
const logout = async (ctx, next) => {
  try {
    const { username, password } = ctx.request.body
  } catch (err) {
    return createJSON({
      success: false,
      msg: err
    })
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  login,
  logout,
}
