var internalServiceError = require('../../../../lib/errors/ServiceError.js');
var util = require('util');

function Information(serviceName, request, response) {
    internalServiceError.call(this);

    this.type = 'Service Response Class: INFORMATION (1xx)'
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

util.inherits(Information, internalServiceError);

module.exports = Information;

