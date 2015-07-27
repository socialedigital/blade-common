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
        criteria.populate = parameters['populate'].replace(/ /g,'').split(',');
        if(_.includes(criteria.populate, 'all')){
            criteria.populate = ['all'];
        }
    }
    return criteria;
}

var formatResponse = function(request, queryResult, criteria){
    if((!queryResult.data || !queryResult.total) && queryResult.length > 1){ //throw here
        throw new Error("JSON Response for a collection must have 'data' and 'total' fields")
    }
    if(!criteria){
        var criteria = queryCriteria(request.allParams())
    }
    var url = request._parsedUrl;
    if(criteria.where && Object.keys(criteria.where).length > 0){
        var where = JSON.stringify(criteria.where);
    }
    var skip = parseInt(criteria.skip || 0, 10);
    var limit = parseInt(criteria.limit || defaultPageSize, 10);
    if(criteria.select){
        var select = criteria.select.join(',');
    }
    if(criteria.populate){
        var populate = criteria.populate.join(',');
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
    var criteria = queryCriteria(parameters);
    //todo: what if the model doesn't have a primary key? (pkAuto is false and no primary key defined)
    try {
        var key = null;
        if (paramKey) {
            key = parameters[paramKey];
        } else {
            key = parameters[primaryKey];
        }
        if (key) {
            return populateQuery(model.findOne(key), criteria.populate)
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
            var result = {
                data: [],
                total: 0
            };
            var getBy = options && options.getBy ? options.getBy : undefined;
            if(getBy){
                criteria = parseGetBy(getBy, parameters, criteria);
            }
            return model.count(criteria.where)
                .then(function (count) {
                    result.total = count;
                    var populate = criteria.populate;
                    criteria.populate = null;
                    return populateQuery(model.find(criteria), populate)
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
                    //waterline throws a catastrophic error that cannot be caught without catch here
                    if(err.name == "NOT FOUND") throw err
                    throw new Error("Invalid Query Criteria") 
                })
        }
    }
    catch (exception) {
        throw exception;
    }
})

var populateQuery = function(modelFind, populateOptions){
    if(!populateOptions){
        return modelFind
    } else {
        if(populateOptions[0] === 'all'){ //if all is in with other arguments, queryCriteria removes them and leaves only all.
            return modelFind.populateAll()
        }
        else{
            //chain any number of .populate calls, .populate only accepts one argument
            return _.reduce(populateOptions, function(query, relation){ return query.populate(relation) }, modelFind)
        }
    }
}

var parseGetBy = function(getBy, parameters, criteria){
    if(_.isArray(getBy)){
        for(var i in getBy){
            var key = getBy[i];
            if(parameters[key]){
                criteria.where[key] = parameters[key];
            }
        }
    }
    else if(_.isObject(getBy)){
        for(var key in getBy){
            var urlVariable = getBy[key];
            if(typeof urlVariable == 'string'){
                if(parameters[urlVariable]){
                    criteria.where[key] = parameters[urlVariable];
                }
            }
            else {
                criteria.where[key] = parameters[key];
            }
        }
    }
    else if(_.isString(getBy)){
        if(parameters[getBy]){
            criteria.where[getBy] = parameters[getBy];
        }
    }
    return criteria;
}

module.exports = {
    "find": find,
    "criteria": queryCriteria,
    "formatResponse": formatResponse
}