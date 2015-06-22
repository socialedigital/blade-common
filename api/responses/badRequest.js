/**
 * 400 (Bad Request) Response
 *
 * The request cannot be fulfilled due to bad syntax.
 * General error when fulfilling the request would cause an invalid state.
 * Domain validation errors, missing data, etc.
 */

var Response = require('../../lib/response.js');

module.exports = function (errors) {
    var response = new Response(this.req, this.res, 400);
    response.addErrors(errors);
    response.send('Sent (400 BAD REQUEST)');
};
