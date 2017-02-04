/**
 * Generic Error Handler / Classifier
 *
 * Calls the appropriate custom response for a given error,
 * out of the response modules:
 *
 * Defaults to `res.serverError`
 *
 * Usage:
 * ```javascript
 * if (err) return res.negotiate(err);
 * ```
 *
 * @param {*} error(s)
 *
 */

 var _ = require('lodash');

var genericError = function(error){
    if(_.isPlainObject(error)){
        for(var prop in error){
            this[prop] = error[prop];
        }
    } else if(_.isString(error)){
        this.message = error;
    }
}

genericError.prototype = new Error;

module.exports = function (error) {
    //todo: should really check that error is an instance of WLError
    if (error.originalError) {
        error = error.originalError;
    }

    var res = this.res;
    var statusCode = error.status || 500;

    if (!(error instanceof Error)) {
        error = new genericError(error);
    }

    res.status(statusCode);

    switch (statusCode) {
        //1xx Informational
        case (statusCode >= 100 && statusCode < 200):
            switch (statusCode) {
                case 100:
                    res.continue(error);
                    break;
                default: res.continue(error);
            }
            break;
        //2xx Success -- we don't use negotiate with these
        //3xx Redirection -- we currently don't use these
        //4xx Client Error
        case (statusCode >= 400 && statusCode < 500):
            switch (statusCode) {
                case 400:
                    return res.badRequest(error);
                    break;
                case 401:
                    return res.unauthorized(error);
                    break;
                case 403:
                    return res.forbidden(error);
                    break;
                case 404:
                    return res.notFound(error);
                    break;
                case 408:
                    return res.requestTimeout(error);
                    break;
                case 409:
                    return res.conflict(error);
                    break;
                case 415:
                    return res.unsupportedMediaType(error);
                    break;
                case 418:
                    return res.imATeapot(error);
                    break;
                default:
                    return res.badRequest(error);
            }
            break;
        //5xx Server Error
        case (statusCode >= 500 && statusCode < 600):
            switch (statusCode) {
                case 500:
                    return res.serverError(error);
                    break;
                case 501:
                    return res.notImplemented(error);
                    break;
                case 502:
                    return res.badGateway(error);
                    break;
                case 503:
                    return res.serviceUnavailable(error);
                    break;
                case 504:
                    return res.gatewayTimeout(error);
                    break;
                default:
                    return res.serverError(error);
            }
            break;
        default:
            return res.serverError(error);      //default to 500 Internal Server Error
    }
};
