/**
 * 500 (Internal Server Error) Response
 *
 * A generic error message, given when no more specific message is suitable.
 * The general catch-all error when the server-side throws an exception.
 */

var Response = require('../../lib/response.js');
var ServiceError = require('../services/errors/ServiceError.js');

module.exports = function (errors) {
    var response = new Response(this.req, this.res, 500);
    if (errors && !(errors instanceof ServiceError)) {
        errors = new ServiceError(errors);
    }
    response.addErrors(errors);
    if (process.env.NODE_ENV == 'production') {
        response.addErrors('Internal Server Error');
    }
    response.send('Sent (500 INTERNAL SERVER ERROR)');
};
