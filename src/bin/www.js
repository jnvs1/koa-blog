const app = require('../app')
const debug = require('debug')('demo:server')
const http = require('http')
const IO = require('socket.io')

var port = normalizePort(process.env.PORT || '3302')

const server = http.createServer(app.callback())

const io = IO(server)

io.on('connection', (socket) => {
  socket.on('add', (num) => {
    const result = `add: ${num}`
    io.emit('get', result)
  })

  socket.on('createTopic', topic => {
    io.emit('hasNewTopic', topic)
  })

  socket.on('disconnect', function() {
    // console.log('user disconnected')
  })
})



server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`)
      process.exit(1)
      break
    default:
      throw error
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log(`Listening on ${bind}`)
  debug(`Listening on ${bind}`)
}
