/**
 * QueryService.js
 *
 * @description :: TODO: You might write a short summary of how this service works and what it represents here.
 */

var Promise = require('bluebird');
var queryString = require('querystring');

var defaultPageSize = 10;       //todo: this should be configurable

module.exports = {
    find: function (model, request, options) {
        var url = request._parsedUrl;
        var parameters = request.allParams();
        var primaryKey = model.primaryKey;
        var paramKey = (options.parmKey) ? parmKey : null;
        //todo: what if the model doesn't have a primary key? (pkAuto is false and no primary key defined)
        return new Promise(function (resolve, reject) {
            try {
                var key = null;
                if (paramKey) {
                    key = parameters[paramKey];
                } else {
                    key = parameters[primaryKey];
                }
                if (key) {
                    model.findOne(key)
                        .then(function (modelItem) {
                            if (modelItem) {
                                resolve(modelItem);
                            }
                            else {
                                resolve(undefined);
                            }
                        })
                }
                else {
                    var result = {
                        data: [],
                        _total: 0
                    };
                    var where = parameters['where'];
                    if (_.isString(where)) {
                        try {
                            where = queryString.unescape(where);
                            where = JSON.parse(where);
                        }
                        catch (exception) {
                            reject(new Error('Unable to parse "where" parameter in URL [' + exception.name + ': ' + exception.message + ']'));
                            return;
                        }
                    }
                    var criteria = {};
                    if (where) criteria.where = where;
                    criteria.limit = parameters['limit'] || defaultPageSize;
                    if (parameters['skip']) criteria.skip = parameters['skip'];
                    if (parameters['sort']) criteria.sort = parameters['sort'];

                    model.count(where)
                        .then(function (count) {
                            result._total = count;
                            return model.find(criteria);
                        }).then(function (results) {
                            if (results.length > 0) {
                                result.data = results;
                                //construct links

                                var query;
                                //previous link
                                var skip = criteria.skip || 0;
                                skip = parseInt(skip, 10);
                                if (skip > 0) {
                                    skip -= results.length;
                                    if (skip >= 0) {
                                        query = [];
                                        if (criteria.where) query.push('where=' + JSON.stringify(criteria.where));
                                        query.push('limit=' + criteria.limit);
                                        if (skip > 0) {
                                            query.push('skip=' + skip);
                                        }
                                        result._prev = url.pathname + '?' + query.join('&');
                                    }
                                }

                                //next link
                                skip = criteria.skip || 0;
                                skip = parseInt(skip, 10);
                                skip += parseInt(criteria.limit, 10);
                                if (skip <= result._total) {
                                    query = [];
                                    if (criteria.where) query.push('where=' + JSON.stringify(criteria.where));
                                    query.push('limit=' + criteria.limit);
                                    query.push('skip=' + skip);
                                    result._next = url.pathname + '?' + query.join('&');
                                }
                                resolve(result);
                            }
                            else {
                                resolve(undefined);
                            }
                        })
                }
            }
            catch (exception) {
                reject(exception);
            }
        })
    }
}
