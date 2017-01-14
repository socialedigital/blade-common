var Promise = require("bluebird");
var _ = require("lodash");


module.exports = function(req, res, routeCall, options){
    var queryDefaults = {
        where: {
            "isDeleted": false
        },
        populate: [],
        select: []
    }
    var serverResponse = {
        "POST": res.created,
        "GET": res.ok,
        "PUT": res.accepted,
        "DELETE": res.accepted
    }
    var reqVerb = req.method;
    var opts = options || {};
    try{
        if(!routeCall){
            throw new Error("No Route Call")
        }

        var where;
        //filter the query string if it exists
        if (req.query) {
            where = JSON.parse(req.query.where);
        }


        if(reqVerb === "POST" || reqVerb === "PUT"){
            req.body = MapFields(_.get(opts, "map.in", {}), req.body)
        }
        else if(reqVerb === "GET"){
            var defaults = queryDefaults;
            if(opts.override){
                if(opts.override.where){
                    where = _.merge(where, opts.override.where, function(a,b,k,obj){
                        if(b === undefined){
                            obj[k] = undefined;
                        }
                    });
                }
                if(opts.override.populate){
                    defaults.populate = opts.override.populate; //must be array
                }
                if(opts.override.select){
                    defaults.select = opts.override.select; //must be array
                }
            }
            // req.query.where = sanitizeWhere(req.query.where, defaults.where);
            req.query.where = JSON.stringify(where);

            if(defaults.populate.length > 0){
                req.query.populate = sanitizeArrays(req.query.populate, defaults.populate);
            } else if(req.query.populate){
                req.query.populate = undefined;
            }

            if(defaults.select.length > 0){
                req.query.select = sanitizeArrays(req.query.select, defaults.select);
            } else if(req.query.select){
                req.query.select = undefined;
            }
        }

        req.inFilter = true;        //this is a short term hack that signals
        routeCall(req, res)
        .then(function(results){
            results = results.json;
            var resource = {};
            if(results.data && _.isArray(results.data)){
                resource.total = results.total;
                resource.data = _.map(results.data, function(item){
                    return MapFields(_.get(opts, "map.out", {}), item);
                })
            } else if(!results.data && _.isPlainObject(results)){
                resource = MapFields(_.get(opts, "map.out", {}), results);
            }
            if(reqVerb === "POST"){
                return res.created(resource, options.resourceUrl);
            } else {
                return serverResponse[reqVerb](resource);
            }

        })
        .catch(function(err){
            console.log(err)
            var statusCode = getErrorStatus(err);
            var errorFunction = defaultErrorResponse;
            if(typeof opts.errors === "function"){
                errorFunction = opts.errors;
            }
            return errorFunction(err, statusCode, req, res, opts);
        })
    }
    catch(err){
        sails.log.error(err);
        res.send(500, err);
    }
}

var getErrorStatus = function(err){
    var statusCode = _.get(err, "response.status", undefined);
    if(!statusCode){
        statusCode = _.get(err, "service.response.status", 500);
    }
    return statusCode;
}

var defaultErrorResponse = function(err, statusCode, req, res, opts){
    var customErr = {error: "", status: statusCode, fields: undefined};
    var errorMessages = {
        400: "Bad Request - Fields sent were incorrect, missing, or did not pass validation",
        401: "Unauthorized",
        404: "NOT FOUND: The resource you requested was not found"
    }
    customErr.error = errorMessages[statusCode];
    if(statusCode === 400){
        var fields = _.get(err, "service.response.json.error.invalidAttributes", undefined);
        if(fields){
            var errorMap = mapInvertAndFlatten(_.get(opts, "map.in", {}));
            customErr.fields = MapFields(errorMap, fields);
        }
    }
    return res.send(statusCode, customErr);
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


var sanitizeWhere = function(where, defaults){
    if(!where){
        return JSON.stringify(defaults);
    }
    try{
        where = JSON.parse(where);
    }
    catch(err){
        return where;
    }

    var __inDefaults = function(value, key){
        return (key in defaults);
    }

    var newWhere = _.pick(where, __inDefaults);

    return JSON.stringify(newWhere);
} 

var sanitizeArrays = function(arrString, defaults){
    arrString = arrString || "";
    var arr = arrString.split(',');
    arr = defaults;
    return arr.join();
}
