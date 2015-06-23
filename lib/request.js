var http = require('http');
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


module.exports = function(options) {
    return new Promise(function(resolve, reject) {
        var data;
        var timeout;
        var serviceName;

        if (options.data) {
            data = options.data;
            delete options.data;
        };
        if (options.service) {
            if (!options.hasOwnProperty('headers')) {
                options.headers = {};
            }
            options.headers['Content-Type'] = 'application/json; charset=utf-8';
            options.headers['X-Blade-Service'] = options.service;
            serviceName = options.service;
            delete options.service;
        }
        if (options.timeout) {
            timeout = options.timeout;
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
                try {
                    result.json = JSON.parse(result.body);
                }
                catch (exception) {
                    //result.body is not JSON
                }
                sails.log.verbose('Request:\n' + util.inspect(options, inspectOptions));
                sails.log.verbose('Response:\n' + util.inspect(result, inspectOptions));
                if (accept(result.status, '2xx', 404)) {
                    resolve(result.json);
                }
                else {
                    var rejectError = new ServiceError(serviceName, result);
                    reject(rejectError);
                }
            });
        });

        if (timeout) {
            request.setTimeout(timeout, function () {
                request.abort();
                reject(new ServiceError(serviceName, request.method + ' ' + request.url + ' timed out after ' + timeout + ' seconds.'));
            });
        }
        // Handle errors (does this ever get called?)
        request.on('error', function(error) {
            reject(new ServiceError(serviceName, error));
        });

        if (data) {
            request.write(JSON.stringify(data));
        }

        request.end();
    });
}
