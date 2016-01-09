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

//var http = require('https');
var http = require('http');
var EventEmitter = require('events');
var uuid = require('uuid');

var validTypes = {
    "image/jpeg": true,
    "image/gif": true,
    "image/png": true,
    "application/pdf": true
}

var upload = Promise.promisify(function(req, options, cb){
    console.log(req.body)
    if(!options || !options.clientId || !options.cardAccount){
        throw new Error("Must pass options with 'clientId' and 'cardAccount'")
    } else {
        var clientId = options.clientId;
        var cardAccount = options.cardAccount;
    }
    var listener = options.listener || "image";
    var data = [];
    req.file(listener).upload(
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

            if (files.length < 1) return cb(new ValidationError("image", "Must send atleast 1 image"));

            try{
              Service.request('service.image')
              .post('/images/clients/' + clientId + '/cardAccounts/' + cardAccount, {imagedocs: data})
              .then(function(response){
                return cb(undefined, response.json);
            })
              .catch(function(err){
                awsDeleteFiles(files, "fd");
                return cb(err);
            })
          }
          catch(err){
              //queue image service data creation if it is down? or delete s3 data and force user to try again?
              awsDeleteFiles(files, "fd");
              return cb(err);
            }
        })
})

var s3upload = function(fileName, fileStream, mimeType, cb){
    var params = {Bucket: sails.config.s3.bucket, Key: null, Body: null};
    params.Key = fileName;
    params.Body = fileStream;
    s3.upload(params, function(err, data){
        if(err){
            cb("AWS: " + err)
        } else {
            cb(null, {url: data.Location, filename: fileName, mimeType: mimeType})
        }
    })
}

var s3delete = function(filename){
    var params = {Bucket: sails.config.s3.bucket, Key: filename};
    console.log("DELETING " + filename + " FROM S3 ON ERROR")
    s3.deleteObject(params, function(err, data){

    })
}

var awsDeleteFiles = function(files, key){
    var params = {Bucket: sails.config.s3.bucket, Delete: {Objects:[]}};
    _.forEach(files, function(file){
        console.log("DELETING " + file.name + " FROM S3 ON ERROR")
        params.Delete.Objects.push({Key: file[key]})
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
            cb(new ValidationError("image", file.filename + " is invalid type, must be " + Object.keys(validTypes).join(', ')))
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
                file.removeListener('data', gotData);
                file.unpipe(outputs);
                outputs.removeListener('finish', successfullyWroteFile)
                cb(new ValidationError("image", file.filename + " exceeds maximum file size of 2MB"));
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
                  cb(new ValidationError("image", file.filename + " is invalid type, must be " + Object.keys(validTypes).join(', ')))
                  return done(true);
              }
              var fileStream = fs.createReadStream(fileSavePath);
              s3upload(file.fd, fileStream, mimeType, function(err, uploadData){
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

    }
return documentReceiver;
}

module.exports.upload = upload;

// Retrieve KYC docs from remote server
var download = Promise.promisify(function(req, options, cb){
    var files = req.body.files;

    //check all required parameters synchronously
    var inputError = errorCheck(files, options);
    if(inputError){
        return cb(inputError);
    }
    //call client service to verify cardAccount exists and get the cardProgram
    Service.request("service.client")
    .get("/cardAccounts/" + options.cardAccount + "?populate=cardProgram")
    .then(function(cardAccount){
        cardAccount = cardAccount.json;
        var downloadState = new EventEmitter();
        var uploadedData = [];
        var fileBuffers = [];
        var i = 0;

        downloadState.on("error", function(err){
            downloadState.removeListener("next", next);
            downloadState.removeListener("success", success);
            setTimeout(function(){ 
                if(uploadedData.length > 0) {
                    awsDeleteFiles(uploadedData, "filename");
                }
            }, 5000);
            return cb(err);
        })

        downloadState.on("next", next);
        downloadState.on("success", success);

        function next(){
            if(i < files.length){
                request(files[i], downloadState);
                i += 1;
            }
        }

        function success(downloadedFile){
            s3upload(downloadedFile.fd, downloadedFile.fileBuffer, downloadedFile.type, function(err, data){
                if(err){
                    return cb(err);
                }
                data.name = downloadedFile.filename;
                data.description = downloadedFile.description;
                data.proof = downloadedFile.proof;
                uploadedData.push(data);
                fileBuffers.push(downloadedFile);
                if(uploadedData.length === files.length){
                    // send files to bank adapter
                    sendToBankAdapter(fileBuffers, cardAccount)
                    .then(function(bankResponse){
                        //send meta data to image service and return response
                        var reqUrl = '/images/clients/' + options.clientId + '/cardAccounts/' + cardAccount.token;
                        return Service.request('service.image')
                        .post(reqUrl, {imagedocs: uploadedData})
                    })
                    .then(function(imageResponse){
                        console.log(imageResponse)
                        return cb(undefined, imageResponse.json);
                    })
                    .catch(function(err){
                        awsDeleteFiles(uploadedData, "filename");
                        return cb(err);
                    })
                }
            })
            downloadState.emit("next");
        }
        downloadState.emit("next");
    })
})

var urlMatch = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
var urlRegex = new RegExp(urlMatch);

var errorCheck = function(files, options){
    if(!options || !options.clientId || !options.cardAccount){
        return new ValidationError("files", "KYC", "Must send parameters 'clientId' and 'cardAccount'");
    }
    if(!files){
        return new ValidationError("files", "KYC", "Missing files field in request");
    }
    if(files.length !== 2){
        return new ValidationError("files", "KYC", "Must send exactly two documents");
    }
    for(var i in files){
        var file = files[i];
        if(!file.url){
            return new ValidationError("files", "KYC", "Cannot download file with missing URL");
        }
        if(!file.url.match(urlRegex)){
            return new ValidationError("files", "KYC", file.url + " is an invalid URL"); 
        }
        if(file.proof !== 'identity' && file.proof !== 'address'){
            return new ValidationError("files", "KYC", "Must send proof field denoting whether document is proof of identity or address");
        }
    }
    var proofs = _.uniq(_.pluck(files, 'proof'));
    if(proofs.length !== 2){
        return new ValidationError("files", "KYC", "One file must be denoted as proof of identity and one must be denoted as proof of address.");
    }

    return false;
}

var makeFilename = function(type){
    var extension = "." + type.split("/")[1];
    return uuid.v4() + extension;
}

var request = function(file, downloadState){
    var stream = {length: 0, type: "", fileBuffer: [], fd: "", filename: file.filename, description: file.description, proof: file.proof};
    var fileReq = http.get(file.url, function(res){

        if(res.statusCode !== 200){
            res.destroy();
            fileReq.destroy();
            downloadState.emit("error", new ValidationError("image", "KYC", file.url + " is invalid."));
        }

        res.on('data', function(chunk){
            stream.length += chunk.length;
            if(stream.length > 2000000){
                res.destroy();
                fileReq.destroy();
                downloadState.emit("error", new ValidationError("image", "KYC", file.filename + " exceeds maximum file size of 2MB"));
            } else {
                stream.fileBuffer.push(chunk);
            }
        })

        res.on('end', function success(){
            stream.fileBuffer = Buffer.concat(stream.fileBuffer);
            magic.detect(stream.fileBuffer, function(err, result){
                if(err){
                  res.destroy();
                  fileReq.destroy();
                  downloadState.emit("error", err);
              }
              stream.type = result;
              if(!(stream.type in validTypes)){
                  res.destroy();
                  fileReq.destroy();
                  downloadState.emit("error", new ValidationError("image", "KYC", file.filename + " is invalid type, must be " + Object.keys(validTypes).join(', ')));
              } else {
                  stream.fd = makeFilename(stream.type);
                  downloadState.emit("success", stream);
              }
          })
        })
    })

    fileReq.on("socket", function(socket){
        socket.setTimeout(4500);
        socket.on("timeout", function(){
            fileReq.destroy();
            downloadState.emit("error", new ValidationError("image", "KYC", "Request to " + file.url + " timed out."));
        })
    })

    fileReq.on("error", function(err){
        fileReq.destroy();
        downloadState.emit("error", err);
    })
}

var sendToBankAdapter = function(files, cardInfo, options){
    if(!options){
        options = {};
    }
    var encoding = options.encoding || "base64";
    return Bank.findOne(cardInfo.cardProgram.bank)
    .then(function(bank){
        var payload = {};
        payload["bankToken"] = cardInfo.bankToken;
        for(var i in files){
            if(files[i].proof === "identity"){
                payload["identityProof"] = files[i].fileBuffer.toString(encoding);
            } else if(files[i].proof === "address"){
                payload["addressProof"] = files[i].fileBuffer.toString(encoding);
            }
        }
        return Service.request(bank.adapter)
        .post("/kyc", payload)
    })
    .then(function(bankResponse){
        return bankResponse;
    })
}

module.exports.download = download;
