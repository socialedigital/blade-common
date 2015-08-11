var Promise = require('bluebird');
var Writable = require('stream').Writable;
var http = require('http');

var validTypes = {
    "image/jpeg": true,
    "image/gif": true,
    "image/png": true,
    "application/pdf": true
}

var upload = Promise.promisify(function(req, cb){
    req.file('image').upload(documentReceiverStream(), function(err, files){
        if (err) return cb(err) 
        if (files.length < 1) return cb(Error("Must send atleast 1 image"))
        return cb(undefined, files)
    })
})

module.exports.upload = upload;

var documentReceiverStream = function() {

  var documentReceiver = Writable({objectMode: true});
  var streams = {};
  var options = {
    "host": "127.0.0.1",
    "port": "8080",
    "method": "POST",
    "path": "/test",
  }

  // This `_write` method is invoked each time a new file is received
  // from the Readable stream (Upstream) which is pumping filestreams
  // into this receiver.  (filename === `file.filename`).
  documentReceiver._write = function onFile(file, encoding, done) {
    if(!(file.headers['content-type'] in validTypes)){
        return done(file.filename + " is invalid type, must be " + Object.keys(validTypes).join(', '));
    }
    var outputs = http.request(options, function(res){
        res.on('data', function(data){
            console.log(data)
        })
    })

    streams[file.filename] = {length: 0};
    file.pipe(outputs);


    file.on('data', function gotData(data){
      streams[file.filename].length += data.length;
      if(streams[file.filename].length > 2000000){
        streams[file.filename].error = file.filename + " exceeds maximum file size of 2MB";
        file.removeListener('data', gotData);
        file.unpipe(outputs);
        outputs.removeListener('finish', successfullyWroteFile)
        done(streams[file.filename].error);
      }
    })

    file.on('error', function (err) {
      sails.log.error('READ error on file ' + file.filename, '::', err);
      outputs.end()
    });

    outputs.on('error', function failedToWriteFile (err) {
      sails.log.error('failed to write file', file.filename, 'with encoding', encoding, ': done =', done);
      done("write error")
    });

    function successfullyWroteFile () {
        done(undefined, {
          name: file.filename,
          size: file.size,
        })
    }

    outputs.on('finish', successfullyWroteFile)

  };
  return documentReceiver;
}