var serverError = require('./ServerError.js');
var util = require('util');

function ServiceUnavailable(serviceName, request, response, message) {
    serverError.apply(this, [serviceName, request, response, message]);
    this.name = 'SERVICE UNAVAILABLE';
    delete this.type;
    delete this.service.response;
}

util.inherits(ServiceUnavailable, serverError);

module.exports = ServiceUnavailable;
