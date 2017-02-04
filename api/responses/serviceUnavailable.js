/**
 * 503 (Service Unavailable) Response
 *
 * The server is currently unable to handle the request due to a temporary overload or scheduled maintenance,
 * which will likely be alleviated after some delay.
 */

var Response = require('../../lib/response.js');

module.exports = function(options) {
    var response = new Response(this.req, this.res, 503);
    response.applyOptions(options);
    response.send('Sent (503 SERVICE UNAVAILABLE)');
};
