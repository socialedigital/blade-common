var http = require('http');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = function(options) {
    return new Promise(function(resolve, reject) {
        var data;
        if (options.data) {
            data = options.data;
            delete options.data;
        }
        options.headers = { 'authentication': 'ecdf6e5bd244cfbb4a45d6259eeb7424' };
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
                resolve(result);
            });
        });

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
