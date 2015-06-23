var internalServiceError = require('../../../lib/errors/ServiceError.js');
var util = require('util');

function ServiceError(message, error) {
    internalServiceError.apply(this, [this.name, message, error]);
}

util.inherits(ServiceError, internalServiceError);

module.exports = ServiceError;
