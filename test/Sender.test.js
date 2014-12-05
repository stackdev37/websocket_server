var Sender = require('../lib/Sender')
  , PerMessageDeflate = require('../lib/PerMessageDeflate');
require('should');

describe('Sender', function() {
  describe('#frameAndSend', function() {
    it('does not modify a masked binary buffer', function() {
      var sender = new Sender({ write: function() {} });
      var buf = new Buffer([1, 2, 3, 4, 5]);
      sender.frameAndSend(2, buf, true, true);
      buf[0].should.eql(1);
      buf[1].should.eql(2);
      buf[2].should.eql(3);
      buf[3].should.eql(4);
      buf[4].should.eql(5);
    });

    it('does not modify a masked text buffer', function() {
      var sender = new Sender({ write: function() {} });
      var text = 'hi there';
      sender.frameAndSend(1, text, true, true);
      text.should.eql('hi there');
    });

    it('sets rsv1 flag if compressed', function(done) {
      var sender = new Sender({
        write: function(data) {
          (data[0] & 0x40).should.equal(0x40);
          done();
        }
      });
      sender.frameAndSend(1, 'hi', true, false, true);
    });
  });

  describe('#send', function() {
    it('compresses data if compress option is enabled', function(done) {
      var perMessageDeflate = new PerMessageDeflate();
      perMessageDeflate.accept([{}]);

      var sender = new Sender({
        write: function(data) {
          (data[0] & 0x40).should.equal(0x40);
          done();
        }
      }, {
        'permessage-deflate': perMessageDeflate
      });
      sender.send('hi', { compress: true });
    });
  });
});
