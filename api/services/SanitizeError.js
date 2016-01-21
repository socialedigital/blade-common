var _ = require('lodash');

var errorMessages = {
    400: "Bad Request - Fields sent were incorrect, missing, or did not pass validation",
    401: "Unauthorized",
    404: "NOT FOUND: The resource you requested was not found",
    415: "Media Type Unsupported"
}

var getErrorStatus = function(err){
    var statusCode = _.get(err, "status", undefined);
    if(!statusCode){
        statusCode = _.get(err, "response.status", undefined);
    }
    if(!statusCode){
        statusCode = _.get(err, "service.response.status", 500);
    }
    return statusCode;
}

var mapInvertAndFlatten = function(map){
    return _.reduce(map, function(results, value, key){
        if(_.isPlainObject(value)){
            var fieldName = _.get(value, "__fieldName", undefined);
            if(fieldName){
                results[fieldName] = key;
            } else {
                results[key] = key;
            }
            _.merge(results, mapInvertAndFlatten(value))
        } else {
            if(key !== "__fieldName"){
                results[value] = key;
            }
        }
        return results;
    }, {})
}

var process = function(err, map, opts){
    var statusCode = getErrorStatus(err);
    var errorFunction = _.get(opts, "handling[" + statusCode + "]", errorFunctions[statusCode]);
    var customErr = errorFunction(err, statusCode, map);
    return customErr;
}

var badRequest = function(err, status, map){
    var newErr = defaultErrorFunction(err, status, map);
    var fields = _.get(err, "service.response.json.error.invalidAttributes", undefined);
    if(fields){
        var errorMap = mapInvertAndFlatten(map);
        newErr.fields = MapFields(errorMap, fields);
    }
    return newErr;
}

var defaultErrorFunction = function(err, status, map){
    var newErr = {error: errorMessages[status], status: status, message: getErrorMessage(err)};
    return newErr;
}

var getErrorMessage = function(err){
    var message = _.get(err, "message", undefined);
    if(!message){
        message = _.get(err, "response.message", undefined);
    }
    if(!message){
        message = _.get(err, "response.json.message", undefined);
    }
    if(!message){
        message = _.get(err, "service.response.json.error.message", undefined);
    }
    return message;
}

var errorFunctions = {
    400: badRequest,
    401: defaultErrorFunction,
    404: defaultErrorFunction,
    405: defaultErrorFunction,
    415: defaultErrorFunction,
    500: defaultErrorFunction
}

module.exports = {
    getStatus: getErrorStatus,
    getMessage: getErrorMessage,
    map: mapInvertAndFlatten,
    process: process
}