var clientError = require('./ClientError.js');
var util = require('util');

function Unauthorized(serviceName, request, response, message) {
    clientError.apply(this, [serviceName, request, response]);
    this.service.response.message = 'Unauthorized';
    this.name = "UNAUTHORIZED";
    this.status = 401;
}

util.inherits(Unauthorized, clientError);

module.exports = Unauthorized;
