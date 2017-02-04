/**
 * 204 (No Content) Response
 *
 * The server has successfully fulfilled the request and
 * there is no additional content to send in the response payload body.
 */

var Response = require('../../lib/response.js');

module.exports = function(options) {
    var response = new Response(this.req, this.res, 204);
    response.applyOptions(options);
    response.send('Sent (204 NO CONTENT)');
};
