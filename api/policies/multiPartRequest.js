/**
 * multiPartRequest
 *
 * @module      :: Policy
 * @description :: Makes sure that the incoming request has the correct multipart/form-data content-type.
 *
 */

var contentType = require('content-type');
var _ = require("lodash");

module.exports = function (req, res, next) {
    try{
        checkHeaders(req);
        checkContentType(req);
    }
    catch(err){
        res.header('Connection', 'close');
        return res.unsupportedMediaType(err);
    }

    return next();
}

var checkHeaders = function(req){
    if(!req.headers["content-type"]){
        throw new Error("Please use 'multipart/form-data' and denote in the Content-Type header")
    }
    var headers = req.headers["content-type"].split(";");
    for(var i in headers){
        if(headers[i] === "multipart/form-data"){
            return true;
        }
    }
    throw new Error("Please use 'multipart/form-data' and denote in the Content-Type header")
}

var checkContentType = function(req){
    var requestContentType = contentType.parse(req);
    if (requestContentType.type !== 'multipart/form-data') {
        throw new Error("Please use 'multipart/form-data' and denote in the Content-Type header")
    }
}