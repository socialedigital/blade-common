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
        var paramKey = options && options.pkParamName ? options.pkParamName : undefined;
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
                    model.findOne(key).populateAll()
                    .then(function (modelItem) {
                        if (modelItem) {
                            resolve(modelItem);
                        }
                        else {
                            resolve({});
                        }
                    })
                }
                else {
                    var result = {
                        data: [],
                        links: {},
                        total: 0,
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
                    sails.log.verbose(criteria);
                    criteria.limit = parameters['limit'] || defaultPageSize;
                    result.limit = criteria.limit;
                    if (parameters['skip']) {
                        criteria.skip = parameters['skip'];
                        result.offset = criteria.skip;
                    }
                    if (parameters['sort']) {
                        criteria.sort = parameters['sort'];
                        result.sort = criteria.sort;
                    }

                    model.count(where)
                        .then(function (count) {
                            result.total = count;
                            return model.find(criteria).populateAll();
                        }).then(function (results) {
                            if (results.length > 0) {
                                result.data = results;
                                //construct links

                                var query;
                                //previous link
                                var offset = parseInt(criteria.skip || 0, 10);
                                if (offset > 0) {
                                    offset -= results.length;
                                    if (offset >= 0) {
                                        query = [];
                                        if (criteria.where) query.push('where=' + JSON.stringify(criteria.where));
                                        query.push('limit=' + criteria.limit);
                                        if (offset > 0) {
                                            query.push('skip=' + offset);
                                        }
                                        if (!result.links) {
                                            result.links = {};
                                        }
                                        result.links.prev = url.pathname + '?' + query.join('&');
                                    }
                                }

                                //next link
                                offset = criteria.skip || 0;
                                offset = parseInt(offset, 10);
                                offset += parseInt(criteria.limit, 10);
                                if (offset <= result.total) {
                                    query = [];
                                    if (criteria.where) query.push('where=' + JSON.stringify(criteria.where));
                                    query.push('limit=' + criteria.limit);
                                    query.push('skip=' + offset);
                                    if (!result.links) {
                                        result.links = {};
                                    }
                                    result.links.next = url.pathname + '?' + query.join('&');
                                }
                                resolve(result);
                            }
                            else {
                                resolve(result);
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
