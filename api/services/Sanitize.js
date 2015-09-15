var Promise = require("bluebird");
var _ = require("lodash");


module.exports = function(req, res, options, routeCall){
    // var responses = {
    //     "GET": res.ok,
    //     "POST": res.created,
    //     "PUT": res.accepted,
    //     "DELETE": res.accepted
    // }
    var reqVerb = req.method;

    if(options.where){
        req.query.where = sanitizeWhere(req.query.where, options.where);
    }
    if(options.select !== undefined){
        req.query.select = sanitizeSelect(req.query.select, options.select);
    }
    if(options.populate !== undefined){
        req.query.populate = sanitizePopulate(req.query.populate, options.populate);
    }
    if(options.payload !== undefined){
        req.body = sanitizeBody(req.body, options.payload);
    }

    return routeCall(req, res)
    .then(function(results){
        if(results.json){
            results = results.json;
        }
        if(options.strip){
            results = stripResponse(results, options.strip);
        }
        if(reqVerb === "GET"){
            results.uri = req.originalUrl;
        }
        // responses[reqVerb](results);
        return results;
    })
    // .catch(function(err){
    //     console.log("ERR:", err)
    // })
    
}

var stripResponse = function(results, stripParams){
    if(_.isArray(stripParams)){
        stripParams = castArrayToObject(stripParams);
    }
    if(results.data){
        _.forEach(results.data, function(value, i){
            results.data[i] = stripObject(value, stripParams);
        })
    } else {
        results = stripObject(results, stripParams);
    }
    return results;
}

var castArrayToObject = function(arr){
    var obj = {};
    for(var i in arr){
        obj[arr[i]] = true;
    }
    return obj;
}

var stripObject = function(obj, stripParams){
    var __inParams = function(value, key){
        return (key in stripParams);
    }
    return _.omit(obj, __inParams);
}

var sanitizeWhere = function(where, defaults){
    var newWhere = {};
    try{
        where = JSON.parse(where); //need to try catch
    } catch(err){
        return where;
    }

    for(var key in where){
        newWhere[key] = where[key];
    }

    for(var defaultKey in defaults){
        newWhere[defaultKey] = defaults[defaultKey];
    }

    return JSON.stringify(newWhere);
} 

var sanitizePopulate = function(populate, defaults){
    if(!defaults){
        return undefined; //does not allow any population by client
    }
    if(typeof defaults === "string"){
        return defaults;
    }
    if(_.isArray(defaults)){
        return defaults.join();
    }
    if(_.isPlainObject(defaults)){
        var popString = "";
        for(var key in defaults){
            popstring += key;
        }
        return popString;
    }
}

var sanitizeSelect = function(selection, defaults){
    if(!defaults){
        return selection; //lets client use select
    }
    if(typeof defaults === "string"){
        return defaults; //merge client select with defaults? 
    }
    if(_.isArray(defaults)){
        return defaults.join();
    }
    if(_.isPlainObject(defaults)){
        var popString = "";
        for(var key in defaults){
            popstring += key;
        }
        return popString;
    }
}

var sanitizeBody = function(payload, defaults){
    if(!defaults){
        return payload;
    }
    if(_.isArray(defaults)){
        defaults = castArrayToObject(defaults);
    }
    return stripObject(payload, defaults);
}
