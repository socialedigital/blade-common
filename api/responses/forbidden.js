/**
 * 403 (Forbidden) Response
 *
 * The request was a legal request, but the server is refusing to respond to it.
 * Unlike a 401 Unauthorized response, authenticating will make no difference.
 * Error code for user not authorized to perform the operation or the resource is unavailable for some reason.
 */

var Response = require('../../lib/response.js');

module.exports = function () {
    var response = new Response(this.req, this.res, 403);
    response.send('Sent (403 FORBIDDEN');
}