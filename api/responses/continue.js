/**
 * 100 (Continue) Response
 *
 * The client SHOULD continue with its request.  This interim response is used to
 * inform the client that the initial part of the request has been received and has
 * not yet been rejected by the server.
 */

var Response = require('../../lib/response.js');

module.exports = function() {
    var response = new Response(this.req, this.res, 100);
    response.send('Sent (100 CONTINUE)');
};
