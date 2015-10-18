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

module.exports = function (error) {
    //todo: should really check that error is an instance of WLError
    if (error.originalError) {
        error = error.originalError;
    }

    var res = this.res;
    var statusCode = error.status || 500;

    res.status(statusCode);

    // Respond using the appropriate custom response
    if (statusCode === 100) {
        return res.continue(error);
    }
    if (statusCode === 401) {
        return res.unauthorized(error);
    }
    if (statusCode === 403) {
        return res.forbidden(error);
    }
    if (statusCode === 404) {
        return res.notFound(error);
    }
    if (statusCode === 415) {
        return res.unsupportedMediaType(error);
    }
    if (statusCode === 418) {
        return res.imATeapot(error);
    }
    if (statusCode >= 400 && statusCode < 500) {
        return res.badRequest(error);
    }
    return res.serverError(error);
};
