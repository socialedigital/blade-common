/**
 * QueryService.js
 *
 * @description :: TODO: You might write a short summary of how this service works and what it represents here.
 */

var Promise = require('bluebird');
var queryString = require('querystring');

var defaultPageSize = 10;       //todo: this should be configurable

var queryCriteria = function(parameters){
    var where = parameters['where'];
    if (typeof where === 'string') {
        try {
            where = queryString.unescape(where);
            where = JSON.parse(where);
        }
        catch (exception) {
            throw(new Error('Unable to parse "where" parameter in URL [' + exception.name + ': ' + exception.message + ']'));
            return;
        }
    }
    var criteria = {};
    if (where) criteria.where = where;
    criteria.limit = parameters['limit'] || defaultPageSize;
    if (parameters['skip']) {
        criteria.skip = parameters['skip'];
    }
    if (parameters['sort']) {
        criteria.sort = parameters['sort'];
    }
    return criteria;
}

var formatResponse = function(request, queryResult, criteria){
    if(!criteria){
        var criteria = queryCriteria(request.allParams())
    }
    var url = request._parsedUrl;
    //construct links
    var query;
    //previous link
    var offset = parseInt(criteria.skip || 0, 10);
    if (offset > 0) {
        offset -= queryResult.data.length;
        if (offset >= 0) {
            query = [];
            if (criteria.where) query.push('where=' + JSON.stringify(criteria.where));
            query.push('limit=' + criteria.limit);
            if (offset > 0) {
                query.push('skip=' + offset);
            }
            if (!queryResult.links) {
                queryResult.links = {};
            }
            queryResult.links.prev = url.pathname + '?' + query.join('&');
        }
    }

    //next link
    offset = criteria.skip || 0;
    offset = parseInt(offset, 10);
    offset += parseInt(criteria.limit, 10);
    if (offset <= queryResult.total) {
        query = [];
        if (criteria.where) query.push('where=' + JSON.stringify(criteria.where));
        query.push('limit=' + criteria.limit);
        query.push('skip=' + offset);
        if (!queryResult.links) {
            queryResult.links = {};
        }
        queryResult.links.next = url.pathname + '?' + query.join('&');
    }
    return queryResult;
}

var find = Promise.method(function (model, request, options) {
    var parameters = request.allParams();
    var primaryKey = model.primaryKey;
    var paramKey = options && options.pkParamName ? options.pkParamName : undefined;
    //todo: what if the model doesn't have a primary key? (pkAuto is false and no primary key defined)
    try {
        var key = null;
        if (paramKey) {
            key = parameters[paramKey];
        } else {
            key = parameters[primaryKey];
        }
        if (key) {
            return model.findOne(key).populateAll()
            .then(function (modelItem) {
                if (modelItem) {
                    return modelItem;
                }
                else {
                    throw new NotFound('QueryService');
                }
            })
        }
        else {
            var criteria = queryCriteria(parameters);
            var result = {
                data: [],
                total: 0
            };
            return model.count(criteria.where)
                .then(function (count) {
                    result.total = count;
                    return model.find(criteria).populateAll();
                }).then(function (results) {
                    if (results.length > 0) {
                        result.data = results;
                        return result;
                    }
                    else {
                        throw new NotFound('QueryService');
                    }
                })
        }
    }
    catch (exception) {
        throw exception;
    }
})

module.exports = {
    "find": find,
    "criteria": queryCriteria,
    "formatResponse": formatResponse
}