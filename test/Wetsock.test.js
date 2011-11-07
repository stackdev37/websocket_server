var assert = require('assert');
var Wetsock = require('../');
var server = require('./server');

var port = 20000;

module.exports = {
    'connects to echo service': function() {
        var ws = new Wetsock('echo.websocket.org');
        ws.on('connected', function() {
            ws.close();
        });
    },
    'can disconnect before connection is established': function(done) {
        var ws = new Wetsock('echo.websocket.org');
        ws.close();
        ws.on('connected', function() {
            assert.fail('connect shouldnt be raised here');
        });
        ws.on('disconnected', function() {
            done();
        });
    },
    'send before connect should fail': function(done) {
        var ws = new Wetsock('echo.websocket.org');
        try {
            ws.send('hi');            
        }
        catch (e) {
            ws.close();
            done();
        }
    },
    'invalid server key is denied': function(done) {
        var srv = server.listen(++port, server.handlers.invalidKey);
        var ws = new Wetsock('localhost', port);
        ws.on('error', function() {
            srv.close();
            done();
        });
    },    
    'disconnected event is raised when server closes connection': function(done) {
        var srv = server.listen(++port, server.handlers.closeAfterConnect);
        var ws = new Wetsock('localhost', port);
        ws.on('disconnected', function() {
            srv.close();
            done();
        });
    },    
}