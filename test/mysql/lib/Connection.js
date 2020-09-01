const Crypto = require('crypto')
const Events = require('events')
const Net = require('net')
const tls = require('tls')
const ConnectionConfig = require('./ConnectionConfig')
const Protocol = require('./protocol/Protocol')
const SqlString = require('./protocol/SqlString')
const Query = require('./protocol/Query')
const Util = require('util')

module.exports = Connection
Util.inherits(Connection, Events.EventEmitter)

function Connection(options) {
  Events.EventEmitter.call(this)

  this.config = options.config

  this._socket = options.socket
  this._protocol = new Protocol({config: this.config, connection: this})
  this._connectCalled = false
  this.state = 'disconnected'
  this.threadId = null
}

function bindToCurrentDomain(callback) {
  if (!callback) {
    return undefined
  }

  var domain = process.domain

  return domain
    ? domain.bind(callback)
    : callback
}
