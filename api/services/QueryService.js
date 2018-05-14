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
    criteria.skip = parameters['skip'] || 0;
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
        throw new Error("JSON Response with a collection must have 'data' and 'total' fields")
    }
    if(!criteria){
        var criteria = queryCriteria(request.allParams())
    }
    var url = request._parsedUrl;
    var skip = parseInt(criteria.skip || 0, 10);
    var limit = parseInt(criteria.limit || defaultPageSize, 10);

    var queryParamString = "";

    if(criteria.where && Object.keys(criteria.where).length > 0){
        queryParamString += "&" + "where=" + JSON.stringify(criteria.where);
    }
    if(criteria.select){
        queryParamString += "&" + "select=" + criteria.select.join(',');
    }
    if(criteria.populate){
        queryParamString += "&" + "populate=" + criteria.populate.join(',');
    }
    if(criteria.sort){
        queryParamString += "&" + "sort=" + criteria.sort;
    }

    if(queryResult.links){
        queryResult.links = undefined;
    }
    //construct links
    var query = [];
    //previous link
    var offset = skip;
    if (offset > 0) {
        if(limit >= skip) offset -= skip;
        else offset -= limit;
        if (offset >= 0) {
            query = [];
            query.push('limit=' + limit);
            if (offset >= 0) {
                query.push('skip=' + offset);
            }
            if (!queryResult.links) {
                queryResult.links = {};
            }
            queryResult.links.prev = url.pathname + '?' + query.join('&') + queryParamString;
        }
    }

    //next link
    offset = skip + limit;
    if (offset < queryResult.total) {
        query = [];
        query.push('limit=' + limit);
        query.push('skip=' + offset);
        if (!queryResult.links) {
            queryResult.links = {};
        }
        queryResult.links.next = url.pathname + '?' + query.join('&') + queryParamString;
    }

    //first link
    if(queryResult.total > 1){
        query = [];
        query.push('limit=' + limit);
        if (!queryResult.links) {
            queryResult.links = {};
        }
        queryResult.links.first = url.pathname + '?' + query.join('&') + queryParamString;
    }

    //last link
    if(queryResult.total > 1){
        query = [];
        var lastPage;
        var remainder = queryResult.total % limit;
        if(remainder === 0) lastPage = queryResult.total - limit;
        else lastPage = queryResult.total - remainder;
        query.push('limit=' + limit);
        query.push('skip=' + lastPage);
        if (!queryResult.links) {
            queryResult.links = {};
        }
        queryResult.links.last = url.pathname + '?' + query.join('&') + queryParamString;
    }

    return queryResult;
}

var findOne = function (model, request, options){
    var parameters = request.allParams();
    var criteria = queryCriteria(parameters);
    var primaryKey = model.primaryKey;
    var paramKey = options && options.pkParamName ? options.pkParamName : undefined;
    var getBy = options && options.getBy ? options.getBy : undefined;
    var key = null;
    if (paramKey) {
        key = parameters[paramKey];
    } else {
        key = parameters[primaryKey];
    }
    if (key) {
        criteria.where[primaryKey] = key;
    } else if(getBy){
        criteria = parseGetBy(getBy, parameters, criteria);
    }
    return model.count(criteria.where)
    .then(function (count){
        if(count > 1){
            throw new Error("findOne error - your query criteria should be specific and only return one record.");
        }
        if(count < 1){
            var messageContext = {model: request.options.model, param: parameters[getBy[primaryKey]] || key};
            if(messageContext.model && messageContext.param){
                var newMessage = messageContext.model.toUpperCase() + " " + messageContext.param + " does not exist.";
            }
            throw {status: 404, message: newMessage}
        }
        return dbQuery(model, criteria)
    })
    .then(function (results) {
        if(results[0]){
            return results[0];
        }
    })
}

var find = function (model, request, options) {
    var parameters = request.allParams();
    var criteria = queryCriteria(parameters);
    var getBy = options && options.getBy ? options.getBy : undefined;
    if(getBy){
        criteria = parseGetBy(getBy, parameters, criteria);
    }
    var optionalWhere = options && options.where ? options.where : undefined;
    if (optionalWhere) {
        criteria = parseOptionalWhere(optionalWhere, parameters, criteria);
    }
    var result = {
        data: [],
        total: 0
    };
    return model.count(criteria.where)
        .then(function (count) {
            result.total = count;
            return dbQuery(model, criteria)
        })
        .then(function(results){
            result.data = results;
            return result;
        })
            
};

var dbQuery = function (model, criteria){
    var populate = criteria.populate;
    criteria.populate = null;
    return populateQuery(model.find(criteria), populate)
        .then(function (results) {
            return results;
        })
        .catch(function(err){
            //waterline throws a catastrophic error that cannot be caught without catch here
            if(err.name == "NOT FOUND") throw err
            console.log(err)
            throw new Error("Invalid Query Criteria") 
        })
}

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

var parseOptionalWhere = function(where, parameters, criteria) {
    if(_.isObject(where)) {
        for (var key in where) {
            criteria.where[key] = where[key];
        }
    }
    return criteria;
}

module.exports = {
    "find": find,
    "findOne": findOne,
    "criteria": queryCriteria,
    "formatResponse": formatResponse
}