/**
 * QueryService.js
 *
 * @description :: TODO: You might write a short summary of how this service works and what it represents here.
 */

var Promise = require('bluebird');
var queryString = require('querystring');
var _ = require('lodash');

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
    if (where){
        criteria.where = where;
    }
    else{
        criteria.where = {};
    }
    criteria.limit = parameters['limit'] || defaultPageSize;
    if (parameters['skip']) {
        criteria.skip = parameters['skip'];
    }
    if (parameters['sort']) {
        criteria.sort = parameters['sort'];
    }
    if (parameters['select']) {
        criteria.select = parameters['select'].replace(/ /g,'').split(',');
    }
    if (parameters['populate']) {
        if(parameters['populate'] === 'all'){
            criteria.populate = 'all';
        }
        else {
            criteria.populate = parameters['populate'].replace(/ /g,'').split(',');
        }
    }
    return criteria;
}

var formatResponse = function(request, queryResult, criteria){
    if(!criteria){
        var criteria = queryCriteria(request.allParams())
    }
    if(!queryResult.data && !queryResult.total && queryResult.length > 1){
        var newResult = {};
        newResult.data = queryResult;
        newResult.total = queryResult.length;
        queryResult = newResult;
    }
    var url = request._parsedUrl;
    if(criteria.where && criteria.where > 0) var where = JSON.stringify(criteria.where);
    var skip = parseInt(criteria.skip || 0, 10);
    var limit = parseInt(criteria.limit);
    if(criteria.select){
        var select = criteria.select.join(',');
    }
    if(criteria.populate){
        if(criteria.populate instanceof Array){
            var populate = criteria.populate.join(',');
        } else {
            var populate = criteria.populate;
        }
    }
    var sort = criteria.sort;
    //construct links
    var query;
    //previous link
    var offset = skip;
    if (offset > 0) {
        if(limit >= skip) offset -= skip;
        else offset -= limit;
        if (offset >= 0) {
            query = [];
            if (where) query.push('where=' + where);
            query.push('limit=' + limit);
            if (offset > 0) {
                query.push('skip=' + offset);
            }
            if (select){
                query.push('select=' + select);
            }
            if (sort){
                query.push('sort=' + sort);
            }
            if (populate){
                query.push('populate=' + populate)
            }
            if (!queryResult.links) {
                queryResult.links = {};
            }
            queryResult.links.prev = url.pathname + '?' + query.join('&');
        }
    }

    //next link
    offset = skip;
    offset += limit;
    if (offset <= queryResult.total) {
        query = [];
        if (where) query.push('where=' + where);
        query.push('limit=' + limit);
        query.push('skip=' + offset);
        if (select){
                query.push('select=' + select)
        }
        if (sort){
            query.push('sort=' + sort);
        }
        if (populate){
            query.push('populate=' + populate)
        }
        if (!queryResult.links) {
            queryResult.links = {};
        }
        queryResult.links.next = url.pathname + '?' + query.join('&');
    }

    //first link
    if(queryResult.total > 1 && limit < queryResult.total){
        query = [];
        if (where) query.push('where=' + where);
        query.push('limit=' + limit);
        if (select){
            query.push('select=' + select)
        }
        if (sort){
            query.push('sort=' + sort);
        }
        if (populate){
            query.push('populate=' + populate)
        }
        if (!queryResult.links) {
            queryResult.links = {};
        }
        queryResult.links.first = url.pathname + '?' + query.join('&');
    }

    //last link
    if(queryResult.total > 1 && limit < queryResult.total){
        query = [];
        var lastPage;
        var remainder = queryResult.total % limit;
        if(remainder === 0) lastPage = queryResult.total - limit;
        else lastPage = queryResult.total - remainder;

        if (where) query.push('where=' + where);
        query.push('limit=' + limit);
        query.push('skip=' + lastPage);
        if (select){
            query.push('select=' + select)
        }
        if (sort){
            query.push('sort=' + sort);
        }
        if (populate){
            query.push('populate=' + populate)
        }
        if (!queryResult.links) {
            queryResult.links = {};
        }
        queryResult.links.last = url.pathname + '?' + query.join('&');
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
            return model.findOne(key)
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
            var getBy = options && options.getBy ? options.getBy : undefined;
            if(getBy){
                sails.log(getBy)
                if(getBy instanceof Array){
                    for(var i in getBy){
                        if(parameters[getBy[i]]){
                            criteria.where[getBy[i]] = parameters[getBy[i]]
                        }
                    }
                }
                else{
                    criteria.where[getBy] = parameters[getBy]
                }
            }
            sails.log(criteria)
            return model.count(criteria.where)
                .then(function (count) {
                    result.total = count;
                    if(criteria.populate === 'all'){
                        return model.find(criteria).populateAll()
                    }
                    else if(criteria.populate){
                        return _.reduce(criteria.populate, function(query, key){ return query.populate(key) }, model.find(criteria))
                    }
                    else {
                        return model.find(criteria)
                    }
                }).then(function (results) {
                    if (results.length > 0) {
                        result.data = results;
                        return result;
                    }
                    else {
                        throw new NotFound('QueryService');
                    }
                })
                .catch(function(err){
                    if(err.name == "NOT FOUND") throw err
                    throw new Error("Invalid Query Criteria")
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