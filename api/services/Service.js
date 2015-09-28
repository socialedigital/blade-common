var discovery = require('../../lib/discovery.js');
var Promise = require('bluebird');

function constructRestfulURL(serviceName, methodName, route, parameters, findCriteria) {
    var routeParts = route.match(/\/:?[A-Za-z0-9_\\??]*/ig);
    var pathParts = {};
    _.each(routeParts, function(routePart, index) {
        var part = routePart;
        var isParameter = false;
        var isOptional = false;
        if (part[0] == '/') {
            part = part.slice(1);
        }
        if (part[0] == ':') {
            isParameter = true;
            part = part.slice(1);
        }
        if (part[part.length -1] == '?') {
            isOptional = true;
            part = part.slice(0,-1);
        }
        pathParts[part] = {
            index: index,
            isParameter: isParameter,
            isOptional: isOptional,
            value: null
        };
        if (!isParameter) {
            pathParts[part].value = part;
        }
    });

    var requiredParameters = [];
    _.forIn(parameters, function(value, key) {
        if (pathParts[value].isParameter && !pathParts[value].isOptional) {
            requiredParameters.push(key);
        }
    });
    var where = {};

    switch(typeof findCriteria) {
        case 'undefined':
            if (requiredParameters.length > 0) {
                var message = serviceName + '.' + methodName + ' GET requires ';
                if (requiredParameters.length == 1) {
                    message += 'this ';
                }
                else {
                    message += 'these ';
                }
                message += 'parameter';
                if (requiredParameters.length > 1) {
                    message += 's';
                }
                message += ': ' + requiredParameters.join(", ");
                throw new Error(message);
            }
            break;
        case 'number':
            findCriteria = '' + findCriteria;
            //Deliberately falling through to the next case statement (following line turns off warning in JetBrains IDE)
            //noinspection FallthroughInSwitchStatementJS
        case 'string':
            if (requiredParameters.length == 1) {
                var firstParameter = parameters[Object.keys(parameters)[0]];
                if (pathParts.hasOwnProperty(firstParameter)) {
                    pathParts[firstParameter].value = findCriteria;
                }
            }
            else if (requiredParameters.length.length == 0) {
                throw new Error(serviceName + '.' + methodName + ' GET does not take any parameters.');
            }
            else {
                throw new Error(serviceName + '.' + methodName + ' GET requires multiple parameters: ' + requiredParameters.join(", "));
            }
            break;
        case 'object':
            _.each(findCriteria, function(criteria, criteriaName) {
                if (criteriaName == 'where') {
                    where = criteria;
                }
                else {
                    var parameterMap = parameters[criteriaName];
                    if (parameterMap) {
                        pathParts[parameterMap].value = criteria;
                    }
                    else {
                        var message = '"' + criteriaName + '" is not a valid parameter name for ' + serviceName + '.' + methodName;
                        message += ' (valid names are: ' + Object.keys(parameters).join(", ") + ')';
                        throw new Error(message);
                    }
                }
            });
            var missingParts = [];
            _.each(pathParts, function(part, partName) {
                if (!part.isOptional) {
                    if (!part.value) {
                        var parameterName = _.map(parameters, function(value, key) {
                            if (value == partName) {
                                return key;
                            }
                        });
                        _.each(parameterName, function(value) {
                            missingParts.push(value);
                        })
                    }
                }
            });
            if (missingParts.length > 0) {
                var message = serviceName + '.' + methodName + ' GET is missing the following parameter';
                if (missingParts.length > 1) {
                    message += 's';
                }
                message += ': ' + missingParts.join(", ");
                throw new Error(message);
            }
            break;
        default:
            throw new Error('Unknown type "' + typeof findCriteria + '"');
    }
    var requestPath = '';
    for (var i = 0; i < Object.keys(pathParts).length; i++) {
        var part = _.find(pathParts, function(pathPart) {
            return pathPart.index == i;
        });
        if (part) {
            if (part.value) {
                requestPath += '/' + part.value;
            }
            else {
                //do we need to throw an error here?
            }
        }
        else {
            //do we need to throw an error here?
        }
    }
    if (!_.isEmpty(where)) {
        requestPath += '?where=' + JSON.stringify(where);
    }
    return requestPath;
}

function singleGetMethod(properName, serviceName, methodName, route, parameters, modelAttributes) {

    return function get(findCriteria) {
        try {
            var url = constructRestfulURL(properName, methodName, route, parameters, findCriteria);
            return Service.request(serviceName).get(url)
            .then(function (serviceCallResult) {
                var data = serviceCallResult.json;
                var result = {
                    status: serviceCallResult.status,
                    headers: serviceCallResult.headers,
                    json: {}
                };
                //check to make sure that there's only one result that was returned
                if (_.isArray(data)) {
                    if (data.length == 1) {
                        result.json = data[0];
                    }
                    else {
                        throw new Error('Expected a single object result, got multiple result objects: ', data);
                    }
                }
                else if (data !== null && typeof data === 'object') {
                    //check to see if this object has a 'data' property
                    if (data.data) {
                        if (data.data.length == 1) {
                            result.json = data.data[0];
                        }
                        else {
                            var tooManyResults = new Error('Expected a single result, got multiple result objects');
                            tooManyResults.result = data;
                            throw tooManyResults;
                        }
                    }
                    else {
                        //assume this is a single object result
                        result.json = data;
                    }
                }
                else {
                    throw new Error('Unexpected return type: ' + typeof data);
                }
                return result;
            })
        }
        catch (exception) {
            return Promise.reject(exception);
        }
    }
}

function collectionGetMethod(properName, serviceName, methodName, route, parameters, modelAttributes) {
    return function get(findCriteria) {
        var attributes = modelAttributes;
        var route = route;
        var getParameters = parameters;
    }
}

function ServiceObject(obj) {
    var self = this;
    var properName = obj.name.split('.')[1].toLowerCase();
    properName = properName.charAt(0).toUpperCase() + properName.slice(1);
    self['info'] = function() {
        //we can't cache this because it may change between calls
        return discovery.getService(obj.name);
    };

    var info = discovery.getService(obj.name);
    //if (info.interfaces) {
    //    //create a method for each interface name in the list
    //    _.each(info.interfaces, function(interfaceObject, name) {
    //        var attributes;
    //        var methodInfo = {};
    //        _.each(interfaceObject, function(item, key) {
    //            if (key == 'attributes') {
    //                attributes = item;
    //            }
    //            else {
    //                methodInfo[key] = item;
    //            }
    //        });
    //        _.each(methodInfo, function(info, methodName) {
    //            var isCollection;
    //            var actions = {};
    //            _.each(info, function(action, key) {
    //                if (key == 'collection') {
    //                    isCollection = action;
    //                }
    //                else {
    //                    actions[key] = action;
    //                }
    //            });
    //            _.each(actions, function(action, actionName) {
    //                var route;
    //                var parameters = {};
    //                _.each(action, function(parameter, parameterName) {
    //                    if (parameterName == 'route') {
    //                        route = parameter;
    //                    }
    //                    else {
    //                        parameters[parameterName] = parameter;
    //                    }
    //                });
    //                switch(actionName) {
    //                    case 'get':
    //                        if (isCollection) {
    //                            self[methodName] = collectionGetMethod(properName, obj.name, methodName, route, parameters, attributes);
    //                        }
    //                        else {
    //                            self[methodName] = singleGetMethod(properName, obj.name, methodName, route, parameters, attributes);
    //                        }
    //                        break;
    //                    default:
    //                        throw new Error('Unknown action "' + actionName + '"');
    //                }
    //            })
    //        });
    //    });
    //}

    discovery[properName] = self;
}

discovery.on("added", function(obj) {
    if (obj.info.type == 'service') {
        var newService = new ServiceObject(obj);
    }
});

discovery.on("removed", function(obj) {

})

module.exports = discovery;
