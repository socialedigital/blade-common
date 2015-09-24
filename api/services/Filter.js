var Promise = require("bluebird");
var _ = require("lodash");

var getDefaults = {
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
                        result[mapField] = {};
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
        "GET": res.ok
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
            var defaults = getDefaults; //maybe need to clone here
            if(opts.override){
                if(opts.override.where){
                    defaults.where = _.merge(defaults.where, opts.override.where);
                }
                if(opts.override.populate){
                    defaults.populate = opts.override.populate; //must be array
                }
                if(opts.override.select){
                    defaults.select = opts.override.select; //must be array
                }
            }
            req.query.where = sanitizeWhere(req.query.where, defaults.where);

            if(defaults.populate.length > 0){
                req.query.populate = sanitizeArrays(req.query.populate, defaults.populate);
            } else if(req.query.populate){
                req.query.populate = null;
            }

            if(defaults.select.length > 0){
                req.query.select = sanitizeArrays(req.query.select, defaults.select);
            } else if(req.query.select){
                req.query.select = null;
            }
        }

        routeCall(req, res)
        .then(function(results){
            results = results.json;
            if(results.data){
                results.data = _.map(results.data, function(item){
                    return mapFields(_.get(opts, "map.out", {}), item);
                })
            } else {
                results = mapFields(_.get(opts, "map.out", {}), results);
            }
            if(reqVerb === "GET"){
                results.uri = req.originalUrl;
            }
            if(reqVerb === "POST"){
                return res.created(results, options.resourceUrl)
            } else {
                return serverResponse[reqVerb](results);
            }

        })
        .catch(function(err){
            var statusCode = _.get(err, "response.status", 500);
            return res.send(statusCode, err)
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
