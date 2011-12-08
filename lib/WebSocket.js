/*!
 * ws: a node.js websocket client
 * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
 * MIT Licensed
 */

var util = require('util')
  , events = require('events')
  , http = require('http')
  , crypto = require('crypto')
  , url = require('url')
  , fs = require('fs')
  , Sender = require('./Sender')
  , Receiver = require('./Receiver');

/**
 * Constants
 */

var protocolPrefix = "HyBi-";
var protocolVersion = 13;

/**
 * WebSocket implementation
 */

function WebSocket(address, options) {
  if (Object.prototype.toString.call(address) == '[object Array]') {
    /**
     * Act as server client
     */

    this._state = 'connecting';
    this._isServer = true;
    var self = this;
    process.nextTick(function() {
      upgrade.apply(self, address);
    });
  }
  else {
    /**
     * Act as regular client
     */
    
    this._isServer = false;

    var serverUrl = url.parse(address);
    if (!serverUrl.host) throw new Error('invalid url');

    options = options || {};
    options.origin = options.origin || null;
    options.protocolVersion = options.protocolVersion || protocolVersion;
    if (options.protocolVersion != 8 && options.protocolVersion != 13) {
      throw new Error('unsupported protocol version');
    }

    var key = new Buffer(options.protocolVersion + '-' + Date.now()).toString('base64');
    var shasum = crypto.createHash('sha1');
    shasum.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
    var expectedServerKey = shasum.digest('base64');

    // node<=v0.4.x compatibility
    var isNodeV4 = false;
    var agent;
    if (/^v0\.4/.test(process.version)) {
      isNodeV4 = true;
      agent = new http.Agent({
        host: serverUrl.hostname,
        port: serverUrl.port || 80
      });
    }

    var requestOptions = {
      port: serverUrl.port || 80,
      host: serverUrl.hostname,
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Version': options.protocolVersion,
        'Sec-WebSocket-Key': key
      }
    };
    if (isNodeV4) {
      requestOptions.path = (serverUrl.pathname || '/') + (serverUrl.search || '');
      requestOptions.agent = agent;
    }
    else requestOptions.path = serverUrl.path || '/';
    if (options.origin) {
      if (options.protocolVersion < 13) requestOptions.headers['Sec-WebSocket-Origin'] = options.origin;
      else requestOptions.headers['Origin'] = options.origin;
    }

    var req = http.request(requestOptions);
    var self = this;
    (isNodeV4 ? agent : req).on('error', function(error) {
      self.emit('error', error);
    });
    (isNodeV4 ? agent : req).on('upgrade', function(res, socket, upgradeHead) {
      if (self._state == 'disconnected') {
        // client disconnected before server accepted connection
        self.emit('close');
        socket.end();
        return;
      }
      var serverKey = res.headers['sec-websocket-accept'];
      if (typeof serverKey == 'undefined' || serverKey !== expectedServerKey) {
        self.emit('error', 'invalid server key');
        socket.end();
        return;
      }

      upgrade.call(self, res, socket, upgradeHead);
    });

    req.end();
    this._state = 'connecting';
  }

  this._socket = null;
  var realEmit = this.emit;
  this.emit = function(event) {
    if (event == 'error') delete this._queue;
    realEmit.apply(this, arguments);
  }
}

/**
 * Inherits from EventEmitter.
 */

util.inherits(WebSocket, events.EventEmitter);

/**
 * Gracefully closes the connection, after sending a description message to the server
 *
 * @param {Object} data to be sent to the server
 * @api public
 */

WebSocket.prototype.close = function(code, data) {
  if (this._state == 'closing') return;
  if (this._state == 'connecting') {
    this._state = 'disconnected';
    return;
  }
  if (this._state != 'connected') throw new Error('not connected');
  try {
    this._state = 'closing';
    this._closeCode = code;
    this._closeMessage = data;
    var mask = !this._isServer;
    this._sender.close(code, data, mask);
    this.terminate();
  }
  catch (e) {
    this.emit('error', e);
  }
}

/**
 * Sends a ping
 *
 * @param {Object} data to be sent to the server
 * @param {Object} Members - mask: boolean, binary: boolean
 * @api public
 */

WebSocket.prototype.ping = function(data, options) {
  if (this._state != 'connected') throw new Error('not connected');
  options = options || {};
  if (typeof options.mask == 'undefined') options.mask = !this._isServer;
  this._sender.ping(data, options);
}

/**
 * Sends a pong
 *
 * @param {Object} data to be sent to the server
 * @param {Object} Members - mask: boolean, binary: boolean
 * @api public
 */

WebSocket.prototype.pong = function(data, options) {
  if (this._state != 'connected') throw new Error('not connected');
  options = options || {};
  if (typeof options.mask == 'undefined') options.mask = !this._isServer;
  this._sender.pong(data, options);
}

/**
 * Sends a piece of data
 *
 * @param {Object} data to be sent to the server
 * @param {Object} Members - mask: boolean, binary: boolean
 * @param {function} Optional callback which is executed after the send completes
 * @api public
 */

WebSocket.prototype.send = function(data, options, cb) {
  if (this._state != 'connected') throw new Error('not connected');
  if (!data) data = '';
  if (this._queue) {
    var self = this;
    this._queue.push(function() { self.send(data, options, cb); });
    return;
  }
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  options = options || {};
  options.fin = true;
  if (typeof options.mask == 'undefined') options.mask = !this._isServer;
  if (data instanceof fs.ReadStream) {
    startQueue(this);
    var self = this;
    sendStream(this, data, options, function(error) {
      if (typeof cb === 'function') {
        cb(error);
        return;
      }
      executeQueueSends(self);
    });
  }
  else {
    this._sender.send(data, options, cb);
  }
}

/**
 * Streams data through calls to a user supplied function
 *
 * @param {Object} Members - mask: boolean, binary: boolean
 * @param {function} 'function (error, send)' which is executed on successive ticks,
 *           of which send is 'function (data, final)'.
 * @api public
 */

WebSocket.prototype.stream = function(options, cb) {
  if (this._state != 'connected') throw new Error('not connected');
  if (this._queue) {
    var self = this;
    this._queue.push(function() { self.stream(options, cb); });
    return;
  }
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  if (typeof cb != 'function') throw new Error('callback must be provided');
  options = options || {};
  if (typeof options.mask == 'undefined') options.mask = !this._isServer;
  startQueue(this);
  var self = this;
  var send = function(data, final) {
    try {
      if (self._state != 'connected') throw new Error('not connected');
      options.fin = final === true;
      self._sender.send(data, options);
      if (!final) process.nextTick(cb.bind(null, null, send));
      else executeQueueSends(self);
    }
    catch (e) {
      if (typeof cb == 'function') cb(e);
      else self.emit('error', e);
    }
  }
  process.nextTick(cb.bind(null, null, send));
}

/**
 * Immediately shuts down the connection
 *
 * @api public
 */

WebSocket.prototype.terminate = function() {
  if (this._socket) {
    this._socket.end();
    this._socket = null;
  }
  else if (this._state == 'connecting') {
    this._state = 'disconnected';
  }
}

module.exports = WebSocket;

/**
 * Entirely private apis,
 * which may or may not be bound to a sepcific WebSocket instance.
 */

function upgrade(res, socket, upgradeHead) {
  this._socket = socket;
  socket.setTimeout(0);
  socket.setNoDelay(true);
  var self = this;
  socket.on('close', function() {
    if (self._state == 'disconnected') return;
    self._state = 'disconnected';
    self.emit('close', self._closeCode || 1000, self._closeMessage || '');
  });

  var receiver = new Receiver();
  socket.on('data', function (data) {
    receiver.add(data);
  });
  receiver.on('text', function (data, flags) {
    flags = flags || {};
    self.emit('message', data, flags);
  });
  receiver.on('binary', function (data, flags) {
    flags = flags || {};
    flags.binary = true;
    self.emit('message', data, flags);
  });
  receiver.on('ping', function(data, flags) {
    flags = flags || {};
    self.pong(data, {mask: !self._isServer, binary: flags.binary === true});
    self.emit('ping', data, flags);
  });
  receiver.on('close', function(code, data, flags) {
    flags = flags || {};
    self.close(code, data, {mask: !self._isServer});
  });
  receiver.on('error', function(reason, errorCode) {
    // close the connection when the receiver reports a HyBi error code
    if (typeof errorCode !== 'undefined') {
      self.close(errorCode, '', {mask: !self._isServer});
    }
    self.emit('error', reason, errorCode);
  });

  this._sender = new Sender(socket);
  this._sender.on('error', function(error) {
    self.emit('error', e);
  });
  this._state = 'connected';
  this.emit('open');

  if (upgradeHead && upgradeHead.length > 0) receiver.add(upgradeHead);
}

function startQueue(instance) {
  instance._queue = instance._queue || [];
}

function executeQueueSends(instance) {
  try {
    var queue = instance._queue;
    if (typeof queue == 'undefined') return;
    delete instance._queue;
    queue.forEach(function(method) { method(); });
  }
  catch (e) {
    instance.emit('error', e);
  }
}

function sendStream(self, stream, options, cb) {
  stream.on('data', function(data) {
    try {
      if (self._state != 'connected') throw new Error('not connected');
      options.fin = false;
      self._sender.send(data, options);
    }
    catch (e) {
      if (typeof cb == 'function') cb(e);
      else self.emit('error', e);
    }
  });
  stream.on('end', function() {
    try {
      options.fin = true;
      self._sender.send(null, options);
      if (typeof cb === 'function') cb(null);
    }
    catch (e) {
      if (typeof cb == 'function') cb(e);
      else self.emit('error', e);
    }
  });
}