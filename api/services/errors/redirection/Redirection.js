var internalServiceError = require('../../../../lib/errors/ServiceError.js');
var util = require('util');

function Redirection(serviceName, request, response, message) {
    internalServiceError.call(this);

    this.type = 'Service Response Class: REDIRECTION (3xx)'
    if (message) {
        this.message = message;
    }

    this.service = {
        name: serviceName,
        request: {},
        response: {}
    };
    if (request) {
        this.service.request = request;
    };
    if (response) {
        this.service.response = response;
    }
}

util.inherits(Redirection, internalServiceError);

module.exports = Redirection;

