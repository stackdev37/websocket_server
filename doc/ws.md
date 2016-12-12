# ws

## Class: WebSocket.Server

This class is a WebSocket server. It is an `EventEmitter`.

### new WebSocket.Server([options], [callback])

* `options` Object
  * `host` String
  * `port` Number
  * `server` http.Server
  * `verifyClient` Function
  * `handleProtocols` Function
  * `path` String
  * `noServer` Boolean
  * `clientTracking` Boolean
  * `perMessageDeflate` Boolean|Object
* `callback` Function

Construct a new server object.

Either `port` or `server` must be provided, otherwise you might enable
`noServer` if you want to pass the requests directly. Please note that the
`callback` is only used when you supply a `port` number in the options.

### options.verifyClient

`verifyClient` can be used in two different ways. If it is provided with two arguments then those are:
* `info` Object:
  * `origin` String: The value in the Origin header indicated by the client.
  * `req` http.ClientRequest: The client HTTP GET request.
  * `secure` Boolean: `true` if `req.connection.authorized` or `req.connection.encrypted` is set.
* `cb` Function: A callback that must be called by the user upon inspection of the `info` fields. Arguments in this callback are:
  * `result` Boolean: Whether the user accepts or not the handshake.
  * `code` Number: If `result` is `false` this field determines the HTTP error status code to be sent to the client.
  * `name` String: If `result` is `false` this field determines the HTTP reason phrase.

If `verifyClient` is provided with a single argument then that is:
* `info` Object: Same as above.

In this case the return code (Boolean) of the function determines whether the handshake is accepted or not.

If `verifyClient` is not set then the handshake is automatically accepted.

### options.handleProtocols

`handleProtocols` takes a single argument:
* `protocols` Array: The list of WebSocket sub-protocols indicated by the client in the `Sec-WebSocket-Protocol` header.

If returned value is `false` then the handshake is rejected with the HTTP 401 status code, otherwise the returned value sets the value of the `Sec-WebSocket-Protocol` header in the HTTP 101 response.

If `handleProtocols` is not set then the handshake is automatically accepted.

### options.perMessageDeflate

`perMessageDeflate` can be used to control the behavior of [permessage-deflate extension](https://tools.ietf.org/html/draft-ietf-hybi-permessage-compression-19). The extension is disabled when `false`. Defaults to `true`. If an object is provided then that is extension parameters:

* `serverNoContextTakeover` Boolean: Whether to use context take over or not.
* `clientNoContextTakeover` Boolean: The value to be requested to clients whether to use context take over or not.
* `serverMaxWindowBits` Number: The value of windowBits.
* `clientMaxWindowBits` Number: The value of max windowBits to be requested to clients.
* `memLevel` Number: The value of memLevel.
* `threshold` Number: Payloads smaller than this will not be compressed. Default 1024 bytes.

If a property is empty then either an offered configuration or a default value is used.
When sending a fragmented message the length of the first fragment is compared to the threshold. This determines if compression is used for the entire message.

### server.close([callback])

Close the server and terminate all clients, calls callback when done with an error if one occurred.

### server.handleUpgrade(request, socket, upgradeHead, callback)

Handles a HTTP Upgrade request. `request` is an instance of `http.ServerRequest`, `socket` is an instance of `net.Socket`.

When the Upgrade was successfully, the `callback` will be called with a `WebSocket` object as parameter.

### Event: 'error'

`function (error) { }`

If the underlying server emits an error, it will be forwarded here.

### Event: 'headers'

`function (headers) { }`

Emitted with the object of HTTP headers that are going to be written to the `Stream` as part of the handshake.

### Event: 'connection'

`function (socket) { }`

When a new WebSocket connection is established. `socket` is an object of type `WebSocket`.


## Class: WebSocket

This class represents a WebSocket connection. It is an `EventEmitter`.

### new WebSocket(address, [protocols], [options])

* `address` String
* `protocols` String|Array
* `options` Object
  * `protocol` String
  * `agent` Agent
  * `headers` Object
  * `protocolVersion` Number
    -- the following only apply if `address` is a String
  * `host` String
  * `origin` String
  * `pfx` String|Buffer
  * `key` String|Buffer
  * `passphrase` String
  * `cert` String|Buffer
  * `ca` Array
  * `ciphers` String
  * `rejectUnauthorized` Boolean
  * `perMessageDeflate` Boolean|Object
  * `localAddress` String

Instantiating with an `address` creates a new WebSocket client object. If `address` is an Array (request, socket, rest), it is instantiated as a Server client (e.g. called from the `WebSocket.Server`).

### options.perMessageDeflate

Parameters of permessage-deflate extension which have the same form with the one for `WebSocket.Server` except the direction of requests. (e.g. `serverNoContextTakeover` is the value to be requested to the server)

### websocket.bytesReceived

Received bytes count.

### websocket.readyState

Possible states are `WebSocket.CONNECTING`, `WebSocket.OPEN`, `WebSocket.CLOSING`, `WebSocket.CLOSED`.

### websocket.protocolVersion

The WebSocket protocol version used for this connection, `8`, `13`.

### websocket.url

The URL of the WebSocket server (only for clients)

### websocket.upgradeReq

The http request that initiated the upgrade. Useful for parsing authorty headers, cookie headers and other information to associate a specific Websocket to a specific Client. This is only available for WebSockets constructed by a Server.

### websocket.close([code], [data])

Gracefully closes the connection, after sending a description message

### websocket.pause()

Pause the client stream

### websocket.ping([data], [options], [dontFailWhenClosed])

Sends a ping. `data` is sent, `options` is an object with members `mask` and `binary`. `dontFailWhenClosed` indicates whether or not to throw if the connection isnt open.

### websocket.pong([data], [options], [dontFailWhenClosed])

Sends a pong. `data` is sent, `options` is an object with members `mask` and `binary`. `dontFailWhenClosed` indicates whether or not to throw if the connection isnt open.


### websocket.resume()

Resume the client stream

### websocket.send(data, [options], [callback])

* `data` Any The data to send.
* `options` Object An options object.
  * `compress` Boolean Specifies whether `data` should be compressed or not.
    Defaults to `true` when permessage-deflate is enabled.
  * `binary` Boolean Specifies whether `data` should be sent as a binary or not.
    Default is autodetected.
  * `mask` Boolean Specifies whether `data` should be masked or not. Defaults
    to `true` when `websocket` is not a server client.
  * `fin` Boolean Specifies whether `data` is the last fragment of a message or
    not. Defaults to `true`.
* `callback` Function An optional callback which is invoked when the send
  completes.

Sends `data` through the connection.

### websocket.stream([options], callback)

Streams data through calls to a user supplied function. `options` can be an object with members `mask` and `binary`.  `callback` is executed on successive ticks of which send is `function (data, final)`.

### websocket.terminate()

Immediately shuts down the connection

### websocket.onopen
### websocket.onerror
### websocket.onclose
### websocket.onmessage

Emulates the W3C Browser based WebSocket interface using function members.

### websocket.addEventListener(method, listener)

Emulates the W3C Browser based WebSocket interface using addEventListener.

### Event: 'error'

`function (error) { }`

If the client emits an error, this event is emitted (errors from the underlying `net.Socket` are forwarded here).

### Event: 'close'

`function (code, message) { }`

Is emitted when the connection is closed. `code` is defined in the WebSocket specification.

The `close` event is also emitted when then underlying `net.Socket` closes the connection (`end` or `close`).

### Event: 'message'

`function (data, flags) { }`

Is emitted when data is received. `flags` is an object with member `binary`.

### Event: 'ping'

`function (data, flags) { }`

Is emitted when a ping is received. `flags` is an object with member `binary`.

### Event: 'pong'

`function (data, flags) { }`

Is emitted when a pong is received. `flags` is an object with member `binary`.

### Event: 'open'

`function () { }`

Emitted when the connection is established.
