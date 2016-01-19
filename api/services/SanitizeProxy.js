var Promise = require("bluebird");
var _ = require("lodash");

var queryDefaults = {
    where: {
        or: [
                {
                    isDeleted: false
                },
                {
                    isDeleted: null
                }
        ]
    }
}

module.exports = function(req, options){
    var queryString = "";
    var callOptions = options.call;
    var reqVerb = (callOptions.method || req.method).toLowerCase();
    var service = getService(callOptions);
    var url = processRoute(callOptions);
    if(reqVerb === "post" || reqVerb === "put"){
        var body = MapFields(_.get(options, "map.in", {}), req.body)
    } else if(reqVerb === "get"){
        queryString = processQuery(req.query, options.query);
    }

    return Service.request(service)[reqVerb](url + queryString, body)
    .then(function(response){
        response = response.json;
        var results = {};
        if(response.data && _.isArray(response.data)){
            results.total = response.total;
            results.data = _.map(response.data, function(item){
                return MapFields(_.get(options, "map.out", {}), item);
            })
        } else if(!response.data && _.isPlainObject(response)){
            results = MapFields(_.get(options, "map.out", {}), response);
        }
        return results;
    })
    .catch(function(error){
        throw SanitizeError.process(error, options.map || {});
    })
}

function getService(callOptions){
    if(callOptions.service){
        return "service." + callOptions.service.toLowerCase();
    } else if(callOptions.adapter){
        return "adapter." + callOptions.adapter.toLowerCase();
    } else {
        throw "No Service or Adapter specified"
    }
}

function processRoute(callOptions){
    var url = callOptions.url;
    var params = callOptions.parameters;
    if(!url){
        throw "Cannot make service call without url";
    }
    if(_.isEmpty(params)){
        return url;
    }
    var route = url.split("/");
    for(var string in route){
        if(route[string][0] === ":"){
            var parameter = route[string].replace(":", "");
            if(parameter[parameter.length - 1] === "?"){
                route[string] = params[parameter.replace("?", "")] || "";
            } else {
                if(params[parameter]){
                route[string] = params[parameter];
                } else {
                    throw "No value provided for parameter " + parameter
                }
            }
        }
    }
    return route.join("/");
}

function processQuery(userQuery, queryOptions){
    var queryParameters = {};
    if(_.isPlainObject(queryOptions)){
        queryParameters = _.merge(queryOptions, _.clone(queryDefaults));
    } else {
        queryParameters = _.clone(queryDefaults);
    }
    if(userQuery.limit){
        queryParameters.limit = userQuery.limit;
    }
    if(userQuery.skip){
        queryParameters.skip = userQuery.skip;
    }
    return stringifyQuery(queryParameters);
}

function stringifyQuery(queryObject){
    var queryString = "";
    if(!queryObject){
        return queryString;
    }
    if(queryObject.where){
        queryString += "&where=" + JSON.stringify(queryObject.where);
        queryObject.where = null;
    }
    if(queryObject.select){
        queryString += "&select=" + queryObject.select.join(",");
        queryObject.select = null;
    }
    if(queryObject.populate){
        queryString += "&populate=" + queryObject.populate.join(",");
        queryObject.populate = null;
    }

    for(var param in queryObject){
        if(queryObject[param] !== null){
            queryString += "&" + param + "=" + queryObject[param];
        }
    }
    if(queryString.length > 0){
        queryString = "?" + queryString.slice(1)
    }
    return queryString;
}
