/**
 * validJSONRequest
 *
 * @module      :: Policy
 * @description :: Makes sure that the incoming request has the correct JSON or JSONP content-type.
 *                 Also verifies that the encoding on the request is
 *
 */

var contentType = require('content-type')

module.exports = function validJSONRequest (req, res, next) {
    try {
        var requestContentType = contentType.parse(req);
    }
    catch(exception) {
        return res.unsupportedMediaType({
            name: 'Unknown Content-Type',
            message: "Unable to determine Content-Type",
            description: "Please use 'application/json'"
        });
    }

    if (requestContentType.parameters['charset']) {
        if (requestContentType.parameters.charset.toLowerCase() != 'utf-8') {
            return res.unsupportedMediaType({
                name: 'Unsupported Character Encoding',
                mesasge: "'" + requestContentType.parameters.charset + "' is an usupported character encoding.",
                description: "Please use 'charset=utf-8'."
            });
        }
    }

    if (requestContentType.type != 'application/json') {
        return res.unsupportedMediaType({
            name: 'Unsupported Content-Type',
            message: "'" + requestContentType.type + "' is an usupported media type.",
            description: "Please use 'application/json'"
        });
    }

    return next();
}
