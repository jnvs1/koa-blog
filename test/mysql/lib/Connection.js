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

Connection.createQuery = function createQuery(sql, values, callback) {
  if (sql instanceof Query) {
    return sql
  }

  let cb = bindToCurrentDomain(callback)
  let options = {}
  if (typeof sql === 'function') {
    cb = bindToCurrentDomain(sql)
    return new Query(options, cb)
  }

  if (typeof sql === 'object') {
    for (let prop in sql) {
      options[prop] = sql[prop]
    }

    if (typeof values === 'function') {
      cb = bindToCurrentDomain(values)
    } else if (values !== undefined) {
      options.values = values
    }

    return new Query(options, cb)
  }

  options.sql = sql
  options.values = values

  if (typeof values === 'function') {
    cb = bindToCurrentDomain(values)
    options.values = undefined
  }

  if (cb === undefined && callback !== undefined) {

      throw new TypeError('argument callback must be a function when provided');
  }

  return new Query(options, cb)
}

Connection.prototype.connect = function connect(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }

  if (!this._connectCalled) {
    this._connectCalled = true

    // Connect either via a UNIX domain socket or a TCP socket.
    this._socket = (this.config.socketPath)
      ? Net.createConnection(this.config.socketPath)
      : Net.createConnection(this.config.port, this.config.host)

    // Connect socket to connection domain
    if (Events.usingDomains) {
      this._socket.domain = this.domain
    }

    let connection = this
    this._protocol.on('data', function(data) {
      connection._socket.write(data)
    })
    this._socket.on('data', function(data) {
      connection._protocol.write(data)
    })
    this._protocol.on('end', function() {
      connection._socket.end()
    })
    this._socket.on('end', function () {
      connection._protocol.end()
    })

    this._socket.on('error', this._handleNetworkError.bind(this));
    this._socket.on('connect', this._handleProtocolConnect.bind(this));
    this._protocol.on('handshake', this._handleProtocolHandshake.bind(this));
    this._protocol.on('unhandledError', this._handleProtocolError.bind(this));
    this._protocol.on('drain', this._handleProtocolDrain.bind(this));
    this._protocol.on('end', this._handleProtocolEnd.bind(this));
    this._protocol.on('enqueue', this._handleProtocolEnqueue.bind(this));

    if (this.config.connectTimeout) {
      var handleConnectTimeout = this._handleConnectTimeout.bind(this)

      this._socket.setTimeout(this.config.connectTimeout, handleConnectTimeout)
      this._socket.once('connect', function() {
        this.setTimeout(0, handleConnectTimeout)
      })
    }
  }

  this._protocol.handshake(options, bindToCurrentDomain(callback))
}

Connection.prototype.changeUser = function changeUser(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options
    options = {}
  }

  this._implyConnect()

  let charsetNumber = (options.charsets)
    ? ConnectionConfig.getCharsetNumber(options.charset)
    : this.config.charsetNumber

  return this._protocol.changeUser({
    user          : options.user || this.config.user,
    password      : options.password || this.config.password,
    database      : options.database || this.config.database,
    timeout       : options.timeout,
    charsetNumber : charsetNumber,
    currentConfig : this.config
  }, bindToCurrentDomain(callback))
}

Connection.prototype.commit = function commit(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = options || {}
  options.sql = 'COMMIT'
  options.values = null

  return this.query(options, callback)
}

Connection.prototype.rollback = function rollback(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = options || {};
  options.sql = 'ROLLBACK';
  options.values = null;

  return this.query(options, callback);
}

Connection.prototype.query = function query(sql, values, cb) {
  const query = Connection.createQuery(sql, values, cb)
  query._connection = this
  if (!(typeof sql === 'object' && 'typeCast' in sql)) {
    query.typeCast = this.config.typeCast
  }

  if (query.sql) {
    query.sql = this.format(query.sql, query.values)
  }

  this._implyConnect

  return this._protocol._enqueue(query)
}

Connection.prototype.ping = function ping(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  this._implyConnect()
  this._protocol.ping(options, bindToCurrentDomain(callback))
}

Connection.prototype.statistics = function statistics(options, callback) {
  if (!callback && typeof options === 'function') {
    callback = options;
    options = {};
  }

  this._implyConnect();
  this._protocol.stats(options, bindToCurrentDomain(callback));
}

Connection.prototype.end = function end(options, callback) {
  let cb = callback
  let opts = options

  if (!callback && typeof options === 'function') {
    cb = options
    opts = null
  }

  opts = Object.create(opts || null)

  if (opts.timeout === undefined) {
    // default timeout of 30 seconds
    opts.timeout = 30000
  }

  this._implyConnect()
  this._protocol.quit(opts, bindToCurrentDomain(cb))
}

Connection.prototype.destroy = function() {
  this.state = 'disconnected';
  this._implyConnect();
  this._socket.destroy();
  this._protocol.destroy();
}

Connection.prototype.pause = function() {
  this._socket.pause();
  this._protocol.pause();
};

Connection.prototype.resume = function() {
  this._socket.resume();
  this._protocol.resume();
};

Connection.prototype.escape = function(value) {
  return SqlString.escape(value, false, this.config.timezone);
};

Connection.prototype.escapeId = function escapeId(value) {
  return SqlString.escapeId(value, false);
};

Connection.prototype.format = function(sql, values) {
  if (typeof this.config.queryFormat === 'function') {
    return this.config.queryFormat.call(this, sql, values, this.config.timezone)
  }
  return SqlString.format(sql, values, this.config.stringifyObjects, this.config.timezone)
}

if (tls.TLSSocket) {
  Connection.prototype._startTLS = function _startTLS(onSecure) {
    let connection = this
    let secureContext = tls.createSecureContext({
      ca: this.config.ssl.ca,
      cert: this.config.ssl.cert,
      ciphers: this.config.ssl.ciphers,
      key: this.config.ssl.key,
      passphrase: this.config.ssl.passphrase
    })

    // "unpipe"
    this._socket.removeAllListeners('data')
    this._protocol.removeAllListeners('data')

    // socket <-> encrypted
    let rejectUnauthorized = this.config.ssl.rejectUnauthorized
    let secureEstablished = false
    let secureSocket = new tls.TLSSocket(this._socket, {
      rejectUnauthorized: rejectUnauthorized,
      requestCert: true,
      secureContext: secureContext,
      isServer: false
    })

    // error handler for secure socket
    secureSocket.on('_tlsError', function(err) {
      if (secureEstablished) {
        connection._handleNetworkError(err)
      } else {
        onSecure(err)
      }
    })

    // cleartext <-> protocol
    secureSocket.pipe(this._protocol)
    this._protocol.on('data', function(data) {
      secureSocket.write(data)
    })

    secureSocket.on('secure', function() {
      secureEstablished = true

      onSecure(rejectUnauthorized ? this.ssl.verifyError() : null)
    })

    // start TLS communications
    secureSocket._start()
  }
} else {
  // pre-0.11 environment
  Connection.prototype._startTLS = function _startTLS(onSecure) {
    // before TLS:
    //  _socket <-> _protocol
    // after:
    //  _socket <-> securePair.encrypted <-> securePair.cleartext <-> _protocol
    let connection = this
    let credentials = Crypto.createCredentials({
      ca: this.config.ssl.ca,
      cert: this.config.ssl.cert,
      ciphers: this.config.ssl.ciphers,
      key: this.config.ssl.key,
      passphrase: this.config.ssl.passphrase
    })

    let rejectUnauthorized = this.config.ssl.rejectUnauthorized
    let secureEstablished = false
    let securePair = tls.createSecurePair(credentials, false, true, rejectUnauthorized)

    // error handler for secure pair
    securePair.on('error', function(err) {
      if (secureEstablished) {
        connection._handleNetworkError(err);
      } else {
        onSecure(err);
      }
    });

    // "unpipe"
    this._socket.removeAllListeners('data');
    this._protocol.removeAllListeners('data');

    // socket <-> encrypted
    securePair.encrypted.pipe(this._socket);
    this._socket.on('data', function(data) {
      securePair.encrypted.write(data);
    });

    // cleartext <-> protocol
    securePair.cleartext.pipe(this._protocol);
    this._protocol.on('data', function(data) {
      securePair.cleartext.write(data);
    });

    // secure established
    securePair.on('secure', function() {
      secureEstablished = true;

      if (!rejectUnauthorized) {
        onSecure();
        return;
      }

      var verifyError = this.ssl.verifyError();
      var err = verifyError;

      // node.js 0.6 support
      if (typeof err === 'string') {
        err = new Error(verifyError);
        err.code = verifyError;
      }

      onSecure(err);
    });

    // node.js 0.8 bug
    securePair._cycle = securePair.cycle;
    securePair.cycle  = function cycle() {
      if (this.ssl && this.ssl.error) {
        this.error();
      }

      return this._cycle.apply(this, arguments);
    };
  }
}

Connection.prototype._handleConnectTimeout = function() {
  if (this._socket) {
    this._socket.setTimeout(0)
    this._socket.destroy()
  }

  let err = new Error('connect ETIMEDOUT')
  err.errorno = 'ETIMEDOUT';
  err.code = 'ETIMEDOUT';
  err.syscall = 'connect';

  this._handleNetworkError(err)
}

Connection.prototype._handleNetworkError = function(err) {
  this._protocol.handleNetworkError(err);
};

Connection.prototype._handleProtocolError = function(err) {
  this.state = 'protocol_error'
  this.emit('error', err)
}

Connection.prototype._handleProtocolDrain = function() {
  this.emit('drain');
};

Connection.prototype._handleProtocolConnect = function() {
  this.state = 'connected';
  this.emit('connect');
};

Connection.prototype._handleProtocolHandshake = function _handleProtocolHandshake(packet) {
  this.state    = 'authenticated';
  this.threadId = packet.threadId;
};

Connection.prototype._handleProtocolEnd = function(err) {
  this.state = 'disconnected';
  this.emit('end', err);
};

Connection.prototype._handleProtocolEnqueue = function _handleProtocolEnqueue(sequence) {
  this.emit('enqueue', sequence);
};

Connection.prototype._implyConnect = function() {
  if (!this._connectCalled) {
    this.connect()
  }
}
