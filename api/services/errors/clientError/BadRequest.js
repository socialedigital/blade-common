var clientError = require('./ClientError.js');
var util = require('util');

function BadRequest(serviceName, request, response, message) {
    clientError.apply(this, [serviceName, request, response]);
    this.service.response.message = 'Bad Request';
    this.name = 'BAD REQUEST';
    this.status = 400;
}

util.inherits(BadRequest, clientError);

module.exports = BadRequest;
