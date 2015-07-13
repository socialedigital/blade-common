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

module.exports = function (err) {
console.log(err);

    // Get access to response object (`res`)
    var res = this.res;

    var statusCode = 500;
    var body = err;

    try {

        statusCode = err.status || 500;

        // Set the status
        // (should be taken care of by res.* methods, but this sets a default just in case)
        res.status(statusCode);

    } catch (e) {
    }

    // Respond using the appropriate custom response
    if (statusCode === 100) {
        return res.continue(body);
    }
    if (statusCode === 401) {
        return res.unauthorized(body);
    }
    if (statusCode === 403) {
        return res.forbidden(body);
    }
    if (statusCode === 404) {
        return res.notFound(body);
    }
    if (statusCode === 415) {
        return res.unsupportedMediaType(body);
    }
    if (statusCode === 418) {
        return res.imATeapot(body);
    }
    if (statusCode >= 400 && statusCode < 500) {
        return res.badRequest(body);
    }
    return res.serverError(body);
};
