var http = require('http');
var Promise = require('bluebird');
var util = require('util');

var inspectOptions = {
    showHidden: false,
    depth: null,
    colors: true
}

module.exports = function(options) {
    return new Promise(function(resolve, reject) {
        var data;
        var timeout;

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
                'body': '',
                'trailers': response.trailers,
            };

            response.on('data', function(chunk) {
                result.body += chunk;
            });

            response.on('end', function() {
                try {
                    var body = JSON.parse(result.body);
                    result.body = body;
                }
                catch(exception) {
                    //result.body is not JSON
                }
                sails.log.verbose('Request ' + util.inspect(options, inspectOptions));
                sails.log.verbose('Response ' + util.inspect(result, inspectOptions));
                resolve(result);
            });
        });

        if (timeout) {
            request.setTimeout(timeout, function () {
                sails.log.warn('Aborting ' + util.inspect(options, inspectOptions));
                request.abort();
            });
        }
        // Handle errors
        request.on('error', function(error) {
            reject(error);
        });

        if (data) {
            request.write(JSON.stringify(data));
        }

        request.end();
    });
}
