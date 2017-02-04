/**
 * 502 (Bad Gateway) Response
 *
 * The server, while acting as a gateway or proxy, received an invalid response from an
 * inbound server it accessed while attempting to fulfill the request.
 */

var Response = require('../../lib/response.js');

module.exports = function(options) {
    var response = new Response(this.req, this.res, 502);
    response.applyOptions(options);
    response.send('Sent (502 BAD GATEWAY)');
};
