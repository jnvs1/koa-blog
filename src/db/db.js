const mysql = require('mysql')

const devDB = mysql.createPool({
  connectionLimit: 10,
  host: '120.25.144.98',
  user: 'root',
  password: '716673',
  database: 'test'
})

const prodDB = mysql.createPool({
  connectionLimit: 10,
  host: '120.25.144.98',
  user: 'root',
  password: '716673',
  database: 'demo'
})

const getDB = () => {
  const isDev = true
  // const isDev = false
  return isDev ? devDB : prodDB
}

const query = (sql, values) => {
  return new Promise((resolve, reject) => {
    const pool = getDB()
    pool.getConnection((err, connection) => {
      if (err) {
        resolve(err)
      } else {
        connection.query(sql, values, (err, rows) => {
          err ? reject(err) : resolve(rows)
          connection.release()
        })
      }
    })
  })
}

exports.getDB = getDB
exports.query = query
