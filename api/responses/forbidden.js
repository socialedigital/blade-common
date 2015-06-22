/**
 * 403 (Forbidden) Response
 *
 * The request was a legal request, but the server is refusing to respond to it.
 * Unlike a 401 Unauthorized response, authenticating will make no difference.
 * Error code for user not authorized to perform the operation or the resource is unavailable for some reason.
 */

var Response = require('../../lib/response.js');

module.exports = function (data) {
    var response = new Response(this.req, this.res, 403);
    this.req._sails.log.silly('Sent (403 FORBIDDEN)\n', response);
    response.send('Sent (403 FORBIDDEN');
}