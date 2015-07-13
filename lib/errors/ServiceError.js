var util = require('util');
var _ = require('lodash');

/**
 * Error Class ServiceError
 * */

 function ServiceError(serviceName, message, error) {
    Error.call(this); //super constructor
    Error.captureStackTrace(this, this.constructor);

    this.name = serviceName;

    if (message instanceof Error) {
        error = message;
        message = error.message;
    }

    if ((typeof message != 'string') &&  !(message instanceof String)) {

        if ((error instanceof Error)) {
            this.error = error;
        }
        else {
            _.merge(this, message);
        }
    }
    else {
        this.message = message;
    }

    if ((typeof message == 'string') || (message instanceof String)) {
        if (error) {
            this.error = error;
        }
    }
}

util.inherits(ServiceError, Error);

ServiceError.prototype.setContext = function(context) {
    Error.captureStackTrace(this, context);
}

ServiceError.prototype.setTraceOffset = function(offset) {
    this.traceOffset = offset;
}

module.exports = ServiceError;