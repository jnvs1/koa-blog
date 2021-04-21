const { query } = require('../db/db')

const createUser = (values) => {
  const sql = 'insert into user (username, password, age) values (?, ?, ?)'
  return query(sql, values)
}

const deleteUser = (values) => {
  const sql = 'delete from user where username = ?'
  return query(sql, values)
}

const getUsers = (values) => {
  const sql = 'select id, username, password, age from user where username = ?'
  return query(sql, values)
}

const getAllUsers = (values) => {
  const sql = 'select * from user'
  return query(sql, values)
}

const getUserById = (values) => {
  const sql = 'select * from user where id = ?'
  return query(sql, values)
}

module.exports = {
  createUser,
  getUsers,
  deleteUser,
  getAllUsers,
  getUserById,
}
