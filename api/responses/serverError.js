/**
 * 500 (Internal Server Error) Response
 *
 * A generic error message, given when no more specific message is suitable.
 * The general catch-all error when the server-side throws an exception.
 */

var Response = require('../../lib/response.js');

module.exports = function (errors) {
    var response = new Response(this.req, this.res, 500);
    response.addErrors(errors);
    response.send('Sent (500 INTERNAL SERVER ERROR)');
};
