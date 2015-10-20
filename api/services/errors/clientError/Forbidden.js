var clientError = require('./ClientError.js');
var util = require('util');

function Forbidden(serviceName, request, response, message) {
    clientError.apply(this, [serviceName, request, response]);
    this.service.response.message = 'Forbidden';
    this.name = "FORBIDDEN";
    this.status = 403;
}

util.inherits(Forbidden, clientError);

module.exports = Forbidden;
