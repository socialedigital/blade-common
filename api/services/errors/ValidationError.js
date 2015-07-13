var badRequest = require('./clientError/BadRequest.js');
var util = require('util');

function ValidationError(serviceName, message, error) {
    badRequest.apply(this, [serviceName, message, error]);
}

util.inherits(ValidationError, badRequest);

module.exports = ValidationError;