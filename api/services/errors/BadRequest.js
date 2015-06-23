var ServiceError = require('../../../lib/errors/ServiceError.js');
var util = require('util');

function BadRequest(message, error) {
    ServiceError.apply(this, [this.name, message, error]);
}

util.inherits(BadRequest, ServiceError);

module.exports = BadRequest;
