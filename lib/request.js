var http = require('http');
var Promise = require('bluebird');

module.exports = function(options) {
    return new Promise(function(resolve, reject) {
        var data;
        if (options.data) {
            data = options.data;
            delete options.data;
        };
        var request = http.request(options, function(response) {
            res.setEncoding('utf8');
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
