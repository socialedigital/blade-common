var internalServiceError = require('../../../../lib/errors/ServiceError.js');
var util = require('util');

function ClientError(serviceName, request, response, message) {
    internalServiceError.call(this);

    this.type = 'Service Response Class: CLIENT ERROR (4xx)'
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

util.inherits(ClientError, internalServiceError);

module.exports = ClientError;

