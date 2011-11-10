var assert = require('assert');
var WebSocket = require('../');
var server = require('./testserver');

var port = 20000;

function getArrayBuffer(buf) {
    var l = buf.length;
    var arrayBuf = new ArrayBuffer(l);
    for (var i = 0; i < l; ++i) {
        arrayBuf[i] = buf[i];
    }
    return arrayBuf;
}

function areArraysEqual(x, y) {
    if (x.length != y.length) return false;
    for (var i = 0, l = x.length; i < l; ++i) {
        if (x[i] !== y[i]) return false;
    }
    return true;
}

module.exports = {
    'throws exception for invalid url': function(done) {
        try {
            var ws = new WebSocket('echo.websocket.org');            
        }
        catch (e) {
            done();
        }
    },
    'text data can be sent and received': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.send('hi');
            });
            ws.on('message', function(message, flags) {
                assert.equal('hi', message);
                ws.terminate();
                srv.close();
                done();
            });
        });
    },
    'binary data can be sent and received': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            var array = new Float32Array(5);
            for (var i = 0; i < array.length; ++i) array[i] = i / 2;
            ws.on('connected', function() {
                ws.send(array, {binary: true});
            });
            ws.on('message', function(message, flags) {
                assert.equal(true, flags.binary);
                assert.equal(true, areArraysEqual(array, new Float32Array(getArrayBuffer(message))));
                ws.terminate();
                srv.close();
                done();
            });
        });
    },
    'can disconnect before connection is established': function(done) {
        var ws = new WebSocket('ws://echo.websocket.org');
        ws.terminate();
        ws.on('connected', function() {
            assert.fail('connect shouldnt be raised here');
        });
        ws.on('disconnected', function() {
            done();
        });
    },
    'send before connect should fail': function(done) {
        var ws = new WebSocket('ws://echo.websocket.org');
        try {
            ws.send('hi');
        }
        catch (e) {
            ws.terminate();
            done();
        }
    },
    'send without data should fail': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                try {
                    ws.send();
                }
                catch (e) {
                    srv.close();
                    ws.terminate();
                    done();
                }
            });
        });
    },
    'ping before connect should fail': function(done) {
        var ws = new WebSocket('ws://echo.websocket.org');
        try {
            ws.ping();
        }
        catch (e) {
            ws.terminate();
            done();
        }
    },
    'invalid server key is denied': function(done) {
        server.createServer(++port, server.handlers.invalidKey, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('error', function() {
                srv.close();
                done();
            });
        });
    },
    'disconnected event is raised when server closes connection': function(done) {
        server.createServer(++port, server.handlers.closeAfterConnect, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('disconnected', function() {
                srv.close();
                done();
            });
        });
    },
    'send with unencoded message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.send('hi');
            });
            srv.on('message', function(message, flags) {
                assert.equal(false, flags.masked);
                assert.equal('hi', message);
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'send with encoded message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.send('hi', {mask: true});
            });
            srv.on('message', function(message, flags) {
                assert.equal(true, flags.masked);
                assert.equal('hi', message);
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'send with unencoded binary message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            var array = new Float32Array(5);
            for (var i = 0; i < array.length; ++i) array[i] = i / 2;
            ws.on('connected', function() {
                ws.send(array, {binary: true});
            });
            srv.on('message', function(message, flags) {
                assert.equal(true, flags.binary);
                assert.equal(false, flags.masked);
                assert.equal(true, areArraysEqual(array, new Float32Array(getArrayBuffer(message))));
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'send with encoded binary message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            var array = new Float32Array(5);
            for (var i = 0; i < array.length; ++i) array[i] = i / 2;
            ws.on('connected', function() {
                ws.send(array, {mask: true, binary: true});
            });
            srv.on('message', function(message, flags) {
                assert.equal(true, flags.binary);
                assert.equal(true, flags.masked);
                assert.equal(true, areArraysEqual(array, new Float32Array(getArrayBuffer(message))));
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'ping without message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.ping();
            });
            srv.on('ping', function(message) {
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'ping with message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.ping('hi');
            });
            srv.on('ping', function(message) {
                assert.equal('hi', message);
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'ping with encoded message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.ping('hi', {mask: true});
            });
            srv.on('ping', function(message, flags) {
                assert.equal(true, flags.masked);
                assert.equal('hi', message);
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'pong without message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.pong();
            });
            srv.on('pong', function(message) {
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'pong with message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.pong('hi');
            });
            srv.on('pong', function(message) {
                assert.equal('hi', message);
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'pong with encoded message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.pong('hi', {mask: true});
            });
            srv.on('pong', function(message, flags) {
                assert.equal(true, flags.masked);
                assert.equal('hi', message);
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'close without message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.close();
            });
            srv.on('close', function(message, flags) {
                assert.equal(false, flags.masked);
                assert.equal('', message);
                srv.close();
                ws.terminate();
                done();
            });        
        });
    },
    'close with message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.close('some reason');
            });
            srv.on('close', function(message, flags) {
                assert.equal(false, flags.masked);
                assert.equal('some reason', message);
                srv.close();
                ws.terminate();
                done();
            });        
        });
    },
    'close with encoded message is successfully transmitted to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            ws.on('connected', function() {
                ws.close('some reason', {mask: true});
            });
            srv.on('close', function(message, flags) {
                assert.equal(true, flags.masked);
                assert.equal('some reason', message);
                srv.close();
                ws.terminate();
                done();
            });        
        });
    },
    'close ends connection to the server': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            var connectedOnce = false;
            ws.on('connected', function() {
                connectedOnce = true;
                ws.close('some reason', {mask: true});
            });
            ws.on('disconnected', function() {
                assert.equal(true, connectedOnce);
                srv.close();
                ws.terminate();
                done();
            });
        });
    },
    'very long binary data can be sent and received': function(done) {
        server.createServer(++port, function(srv) {
            var ws = new WebSocket('ws://localhost:' + port);
            var array = new Float32Array(5 * 1024 * 1024);
            for (var i = 0; i < array.length; ++i) array[i] = i / 5;
            ws.on('connected', function() {
                ws.send(array, {binary: true});
            });
            ws.on('message', function(message, flags) {
                assert.equal(true, flags.binary);
                assert.equal(true, areArraysEqual(array, new Float32Array(getArrayBuffer(message))));
                ws.terminate();
                srv.close();
                done();
            });
        });
    },
}
