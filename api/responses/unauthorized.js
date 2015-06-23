/**
 * 401 (Unauthorized) Response
 *
 * Similar to 403 Forbidden.
 * Specifically for use when authentication is possible but has failed or not yet been provided.
 * Error code response for missing or invalid authentication token.
 */

var Response = require('../../lib/response.js');

module.exports = function () {
    var response = new Response(this.req, this.res, 401);
    this.response.send('Sent (401 UNAUTHORIZED)');
};
