var http = require('http');
var Promise = require('bluebird');

module.exports = function(options) {
    sails.log.verbose(options);
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
                sails.log.verbose('Result for ' + JSON.stringify(options));
                sails.log.verbose(result);
                resolve(result);
            });
        });

        if (timeout) {
            request.setTimeout(timeout, function () {
                sails.log.warn('Aborting ' + JSON.stringify(options));
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
