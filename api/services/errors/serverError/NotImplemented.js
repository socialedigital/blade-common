var serverError = require('./ServerError.js');
var util = require('util');

function NotImplemented(serviceName, request, response, message) {
    serverError.apply(this, [serviceName, request, response, message]);
    this.service.response.message = 'Not Implemented';
    this.name = "NOT IMPLEMENTED";
}

util.inherits(NotImplemented, serverError);

module.exports = NotImplemented;
