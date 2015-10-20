var http = require('http');
var queryString = require('querystring');
var Promise = require('bluebird');
var util = require('util');
var url = require('url');
var ServiceError = require('./errors/ServiceError.js');

var inspectOptions = {
    showHidden: false,
    depth: null,
    colors: true
}

function check(toCheck, accept) {
    toCheck = toCheck + ''
    if (toCheck.length !== accept.length) {
        return false
    }
    for (var i = 0; i < toCheck.length; i++) {
        if (accept.charAt(i) === "x") {
            continue
        } else if (toCheck.charAt(i) === accept.charAt(i)) {
            continue
        } else {
            return false
        }
    }
    return true
}

function normalize(code) {
    var CODE_LENGTH = 3
    code = code + ""
    return code.length === CODE_LENGTH ? code : code + new Array(CODE_LENGTH - code.length + 1).join("x")
}

function accept() {
    var args = Array.prototype.slice.call(arguments)
    var toCheck = args.shift()
    var checkVals = args.map(normalize).map(check.bind(this, toCheck))
    for (var i = 0; i < checkVals.length; i++) {
        if (checkVals[i]) return true
    }
    return false
}

function negotiate(context, serviceName, request, response) {
    var error;

    if (accept(response.status, '1xx')) {
        error = new Information(serviceName, request, response);
    }
    if (accept(response.status, '3xx')) {
        error = new Redirection(serviceName, request, response);
    }
    if (accept(response.status, '4xx')) {
        switch (response.status) {
            case 400:
                if (response.error == 'E_VALIDATION') {
                    error = new ValidationError(serviceName, request, response);
                }
                else {
                    error = new BadRequest(serviceName, request, response);
                }
                break;
            case 401:
                error = new Unauthorized(serviceName, request, response);
                break;
            case 403:
                error = new Forbidden(serviceName, request, response);
                break;
            case 404:
                error = new NotFound(serviceName, request, response);
                break;
            case 408:
                error = new RequestTimeout(serviceName, request, response);
                break;
            case 415:
                error = new UnsupportedMediaType(serviceName, request, response);
                break;
            case 418:
                error = new ImATeapot(serviceName, request, response);
                break;
            case 429:
                error = new TooManyRequests(serviceName, request, response);
                break;
            default:
                error = new ClientError(serviceName, request, response);
        }
    }
    if (accept(response.status, '5xx')) {
        switch (response.status) {
            case 500:
                error = new InternalServerError(serviceName, request, response);
                break;
            case 501:
                error = new NotImplemented(serviceName, request, response);
                break;
            case 503:
                error = new ServiceUnavailable(serviceName, request, response);
                break;
            default:
                error = new ServerError(serviceName, request, response);
        }
    }
    if (context) {
        error.setContext(context);
        error.setTraceOffset(2);
    }
    return error;
}

module.exports = function(serviceName, context, options) {
    return new Promise(function(resolve, reject) {
        var data;
        var timeout;

        if (options.data) {
            data = options.data;
        };
        if (options.service) {
            if (!options.hasOwnProperty('headers')) {
                options.headers = {};
            }
            options.headers['Content-Type'] = 'application/json; charset=utf-8';
            options.headers['X-Blade-Service'] = options.service;
            delete options.service;
        }
        if (options.timeout) {
            timeout = options.timeout;
        }
        if (options.path) {
            var path = url.parse(options.path);
            if (path.query) {
                var queryData = queryString.parse(path.query);
                options.path = path.pathname + '?' + queryString.stringify(queryData);
            }
        }
        else {
            options.path = '/';
        }
        var request = http.request(options, function(response) {
            response.setEncoding('utf8');
            // Bundle the result
            var result = {
                'status': response.statusCode,
                'headers': response.headers,
                'body': ''
            };

            response.on('data', function(chunk) {
                result.body += chunk;
            });

            response.on('end', function() {
                if (result.body == '') {
                    result.json = {};
                    delete result.body;
                }
                else {
                    try {
                        result.json = JSON.parse(result.body);
                        delete result.body;
                    }
                    catch (exception) {
                        //result.body is not JSON
                    }
                }
                sails.log.silly('Request:\n' + util.inspect(options, inspectOptions));
                sails.log.silly('Response:\n' + util.inspect(result, inspectOptions));
                if (accept(result.status, '2xx')) {
                    if (result.status == 201) {
                        result.created = true;
                    }
                    resolve(result);
                }
                else {
                    var path = url.parse(options.path);
                    if (path.query) {
                        options.path = path.pathname + '?' + queryString.unescape(path.query);
                    }
                    reject(negotiate(context, serviceName, options, result));
                }
            });
        });

        if (timeout) {
            request.setTimeout(timeout, function () {
                request.abort();
                reject(new RequestTimeout(serviceName, options, request.method + ' ' + request.url + ' timed out after ' + timeout + ' seconds.'));
            });
        }
        // Handle errors
        request.on('error', function(error) {
            reject(new ServiceError(serviceName, options, error));
        });

        if (data) {
            request.write(JSON.stringify(data));
        }

        request.end();
    });
}
