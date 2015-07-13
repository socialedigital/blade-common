var serverError = require('./ServerError.js');
var util = require('util');

function InternalServerError(serviceName, request, response, message) {
    serverError.apply(this, [serviceName, request, response, message]);
    this.service.response.message = 'Internal Server Error';
    this.name = "INTERNAL SERVER ERROR";
}

util.inherits(InternalServerError, serverError);

module.exports = InternalServerError;
