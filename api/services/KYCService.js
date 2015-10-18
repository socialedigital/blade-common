var fs = require('fs');
var _ = require('lodash');
var Writable = require('stream').Writable;
var Promise = require('bluebird');
var path = require('path');

var mmm = require('mmmagic');
var Magic = mmm.Magic;
var magic = new Magic(mmm.MAGIC_MIME_TYPE);

var AWS = require('aws-sdk');
AWS.config.logger = process.stdout;
var s3 = new AWS.S3();

var uploadDir = sails.config.uploadDirectory;

var validTypes = {
    "image/jpeg": true,
    "image/gif": true,
    "image/png": true,
    "application/pdf": true
}


var upload = Promise.promisify(function(req, clientId, bladeToken, cb){
    var data = [];
    req.file('image').upload(
    documentReceiverStream(function(err, uploadData){
      if(err){
        return cb(err);
      }
      data.push(uploadData);
    }), 
    function(err, files){
        if (err){
            return cb("UPLOAD: ", err);
        }
            
        if (files.length < 1) return cb(Error("Must send atleast 1 image"));

        try{
          Service.request('service.image')
          .post('/images/clients/' + clientId + '/accountholders/' + bladeToken, {imagedocs: data})
          .then(function(response){
            return cb(undefined, response.json);
          })
          .catch(function(err){
            awsDeleteFiles(files)
            return cb(err)
          })
        }
        catch(err){
          //queue image service data creation if it is down? or delete s3 data and force user to try again?
          awsDeleteFiles(files)
          return cb(err)
        }
    })
})

var s3upload = function(fileName, filePath, mimeType, cb){
  var params = {Bucket: 'imagedocs', Key: null, Body: null};
  params.Key = fileName;
  params.Body = fs.createReadStream(filePath);
  s3.upload(params, function(err, data){
    if(err){
      cb("AWS: " + err)
    } else {
      cb(null, {url: data.Location, filename: fileName, local: filePath, mimeType: mimeType})
    }
  })
}

var s3delete = function(filename){
  var params = {Bucket: 'imagedocs', Key: filename};
  s3.deleteObject(params, function(err, data){

  })
}

var awsDeleteFiles = function(files){
  var params = {Bucket: 'imagedocs', Delete: {Objects:[]}};
  _.forEach(files, function(file){
    params.Delete.Objects.push({Key: file.fd})
  })
  s3.deleteObjects(params, function(err, data){

  })
}

var checkFile = function(filePath, cb){
  magic.detectFile(filePath, function(err, result){
    if(err){
      console.log(err)
      return cb(err);
    }
    if(!(result in validTypes)){
      return cb(result + " is invalid file type")
    }
    return cb(null, result);
  })
}

var documentReceiverStream = function(cb) {
  var defaults = {
    dirname: uploadDir,
    saveAs: function(file){
      return file.fd;
    }
  };

  var documentReceiver = Writable({objectMode: true});
  var streams = {};

  // This `_write` method is invoked each time a new file is received
  // from the Readable stream (Upstream) which is pumping filestreams
  // into this receiver.  (filename === `file.filename`).
  documentReceiver._write = function onFile(file, encoding, done) {
    if(!(file.headers['content-type'] in validTypes)){
        cb(file.filename + " is invalid type, must be " + Object.keys(validTypes).join(', '))
        return done(true);
    }
    var newFilename = defaults.saveAs(file);
    var fileSavePath = defaults.dirname + newFilename;
    var outputs = fs.createWriteStream(fileSavePath, encoding);

    streams[file.filename] = {length: 0, fd: file.fd, uploadedToS3: false, error: null};
    file.pipe(outputs);

    // Garbage-collect the bytes that were already written for this file.
    // (called when a read or write error occurs)
    function gc(err) {
      sails.log.debug("Garbage collecting file '" + file.filename + "' located at '" + fileSavePath + "'");
      fs.unlink(fileSavePath, function(err){})
    };

    file.on('data', function gotData(data){
      streams[file.filename].length += data.length;
      if(streams[file.filename].length > 2000000){
        streams[file.filename].error = file.filename + " exceeds maximum file size of 2MB";
        file.removeListener('data', gotData);
        file.unpipe(outputs);
        outputs.removeListener('finish', successfullyWroteFile)
        cb(streams[file.filename].error);
        done(true)
      }
    })

    file.on('error', function (err) {
      sails.log.error('READ error on file ' + file.filename, '::', err);
      outputs.end()
      gc(err);
      if(streams[file.filename].uploadedToS3 === true){
        s3delete(file.fd);
      }
    });

    outputs.on('error', function failedToWriteFile (err) {
      sails.log.error('failed to write file', file.filename, 'with encoding', encoding, ': done =', done);
      cb("write error")
      done(true)
      gc(err);
      if(streams[file.filename].uploadedToS3 === true){
        s3delete(file.fd);
      }
    });

    function successfullyWroteFile () {
      checkFile(fileSavePath, function(err, mimeType){
        if(err){
          cb(file.filename + " is invalid type, must be " + Object.keys(validTypes).join(', '))
          return done(true);
        }
        s3upload(file.fd, fileSavePath, mimeType, function(err, uploadData){
          if(err){
            cb("S3: " + err)
            return done(true);
          }
          streams[file.filename].uploadedToS3 = true;
          uploadData.name = file.filename;
          gc();
          cb(undefined, uploadData);
          done(undefined, true);
        })
      })
    }

    outputs.on('finish', successfullyWroteFile)

  };
  return documentReceiver;
}

module.exports.upload = upload;