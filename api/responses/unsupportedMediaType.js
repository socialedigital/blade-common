/**
 * 415 (Unsupported Media Type) Response
 *
 * The request cannot be fulfilled due to bad syntax.
 * General error when fulfilling the request would cause an invalid state.
 * Domain validation errors, missing data, etc.
 */

var Response = require('../../lib/response.js');

module.exports = function (errors) {
    var response = new Response(this.req, this.res, 415);
    response.addErrors(errors);
    response.send('Sent (415 UNSUPPORTED MEDIA TYPE)');
};
