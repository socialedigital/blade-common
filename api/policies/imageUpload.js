/**
 * image upload
 *
 * @module      :: Policy
 * @description :: Allows for application/json or mulipart/form-data depending on the type of request.
 *
 */

var contentType = require('content-type');
var _ = require("lodash");

module.exports = function (req, res, next) {
    try{
        var declaredHeader = checkHeaders(req);
        checkContentType(req, declaredHeader);
    }
    catch(err){
        res.header('Connection', 'close');
        return res.unsupportedMediaType(err);
    }

    return next();
}

var checkHeaders = function(req){
    if(!req.headers["content-type"]){
        throw new Error("Please use 'multipart/form-data' or 'application/json' and denote in the Content-Type header")
    }
    var headers = req.headers["content-type"].split(";");
    for(var i in headers){
        if(headers[i] === "multipart/form-data" || headers[i] === "application/json"){
            return headers[i];
        }
    }
    throw new Error("Please use 'multipart/form-data' or 'application/json' and denote in the Content-Type header")
}

var checkContentType = function(req, declaredHeader){
    var requestContentType = contentType.parse(req);
    if (requestContentType.type == 'multipart/form-data' && declaredHeader == 'multipart/form-data') {
        req.options.fileAction = "upload";
        return true;
    }
    if (requestContentType.type == 'application/json' && declaredHeader == 'application/json') {
        req.options.fileAction = "download";
        return true;
    }
    throw new Error("Please use 'multipart/form-data' or 'application/json' and denote in the Content-Type header")
}