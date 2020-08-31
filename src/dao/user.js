const { query } = require('../db/db')

const getAllUsers = (values) => {
  const sql = 'select * from user'
  return query(sql, values)
}

const getUserById = (values) => {
  const sql = 'select * from user where id = ?'
  return query(sql, values)
}

module.exports = {
  getAllUsers,
  getUserById
}
