var Promise = require("bluebird");
var _ = require("lodash");

var queryDefaults = {
    where: {
        "isDeleted": false
    },
    populate: [],
    select: []
}

var mapFields = function(map, data){
    return _.reduce(map, function(result, mappedKey, key){
        var noData = (!data[key]);
        var mapField = mappedKey;
        if(_.isPlainObject(data[key])){
            if(_.isPlainObject(mappedKey)){
                mapField = _.get(mappedKey, "__fieldName", key);
            } //what to do if map value is string? throw error? allow nested object?
            result[mapField] = mapFields(mappedKey, data[key]);
        }
        else{
            if(key !== "__fieldName"){
                if(_.isPlainObject(mappedKey)){
                    if(noData){
                        mapField = _.get(mappedKey, "__fieldName", key);
                        result[mapField] = undefined; //originally was set to empty object - causes validation errors on PUT
                    }
                } else {
                    if(noData){
                        result[mapField] = undefined;
                    } else {
                        result[mapField] = data[key];
                    }
                }
            }
        }
        return result;
    }, {})
}


module.exports = function(req, res, routeCall, options){
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

        if(reqVerb === "POST" || reqVerb === "PUT"){
            req.body = mapFields(_.get(opts, "map.in", {}), req.body)
        }
        else if(reqVerb === "GET"){
            var defaults = queryDefaults; //maybe need to clone here
            if(opts.override){
                if(opts.override.where){
                    defaults.where = _.merge(defaults.where, opts.override.where, function(a,b,k,obj){
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
            req.query.where = JSON.stringify(defaults.where);

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
            var resource = {};
            results = results.json;
            if(results.data){
                resource.data = _.map(results.data, function(item){
                    return mapFields(_.get(opts, "map.out", {}), item);
                })
            } else {
                resource.data = mapFields(_.get(opts, "map.out", {}), results);
            }
            if(reqVerb === "GET"){
                resource.uri = req.originalUrl;
            }
            if(reqVerb === "POST"){
                return res.created(resource, options.resourceUrl);
            } else {
                return serverResponse[reqVerb](resource);
            }

        })
        .catch(function(err){

            console.log("ERR", err)
            var statusCode = _.get(err, "response.status", undefined);
            if(!statusCode){
                statusCode = _.get(err, "service.response.status", 500);
            }
            //optional callback to process error here, otherwise defaults
            return res.send(statusCode, err);
        })
    }
    catch(err){
        sails.log.error(err);
        res.serverError();
    }
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
