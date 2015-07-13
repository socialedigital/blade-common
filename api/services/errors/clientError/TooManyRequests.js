var clientError = require('./ClientError.js');
var util = require('util');

function TooManyRequests(serviceName, request, response, message) {
    clientError.apply(this, [serviceName, request, response]);
    this.service.response.message = 'Too Many Requests';
    this.name = "TOO MANY REQUESTS";
}

util.inherits(TooManyRequests, clientError);

module.exports = TooManyRequests;
