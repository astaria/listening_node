var crypto = require('crypto');

var express = require('express');
var BinaryServer = require('binaryjs').BinaryServer;
var fs = require('fs');
var wav = require('wav');
var port = 3700;
var app = express();

app.set('views', __dirname + '/tpl');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);
app.use(express.static(__dirname + '/public'))

app.get('/', function(req, res){
  res.render('index');
});

var pgp = require('pg-promise')(/*options*/);
var db = pgp('postgres://janet@localhost/Listening_development')

app.listen(port);

console.log('server open on port ' + port);

binaryServer = BinaryServer({port: 9001});

binaryServer.on('connection', function(client) {
  console.log('new connection');

  var filename = 'audio'+crypto.randomBytes(4).readUInt32LE(0)+'.wav';
  var outFile = 'tmp/' + filename;
  console.log("writing to", outFile);
  var fileWriter = new wav.FileWriter(outFile, {
    channels: 1,
    sampleRate: 44100,
    bitDepth: 16
  });

  client.on('stream', function(stream, meta) {
    console.log('new stream');
    stream.pipe(fileWriter);

    stream.on('end', function() {
      fileWriter.end();
      console.log('wrote to file ' + outFile);
      db.one('INSERT INTO recordings (audio, created_at, updated_at) VALUES ($1, NOW(), NOW())', outFile).then(function (data) {
        console.log('DATA:', data.value)
      }).catch(function (error) {
        console.log('ERROR:', error)
      })
    });
  });
});
