/**
 * 501 (Not Implemented) Response
 *
 * The server does not support the functionality required to fulfill the request.
 */

var Response = require('../../lib/response.js');

module.exports = function(options) {
    var response = new Response(this.req, this.res, 501);
    response.applyOptions(options);
    response.send('Sent (501 NOT IMPLEMENTED)');
};
