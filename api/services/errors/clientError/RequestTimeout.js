var clientError = require('./ClientError.js');
var util = require('util');

function RequestTimeout(serviceName, request, response, message) {
    clientError.apply(this, [serviceName, request, response]);
    this.service.response.message = 'Request Timeout';
    this.name = "REQUEST TIMEOUT";
}

util.inherits(RequestTimeout, clientError);

module.exports = RequestTimeout;
