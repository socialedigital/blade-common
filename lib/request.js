var http = require('http');
var Promise = require('bluebird');

module.exports = function(options) {
    return new Promise(function(resolve, reject) {
        var request = http.request(options, function(response) {
            // Bundle the result
            var result = {
                'httpVersion': response.httpVersion,
                'httpStatusCode': response.statusCode,
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

        request.end();
    });
}
