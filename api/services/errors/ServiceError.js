var internalServiceError = require('../../../lib/errors/ServiceError.js');
var util = require('util');

function ServiceError(serviceName, message, error) {
    internalServiceError.apply(this, [serviceName, message, error]);
}

util.inherits(ServiceError, internalServiceError);

module.exports = ServiceError;
