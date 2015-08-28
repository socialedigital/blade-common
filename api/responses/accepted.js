/**
 * 202 (Accepted) Response
 *
 * The request has been fulfilled and resulted in a resource being changed.
 * Successful action occurred (PUT OR DELETE).
 * Set the Location header to contain a link to the newly-created resource (on POST).
 * Response body content may or may not be present.
 */

var Response = require('../../lib/response.js');

module.exports = function (object, uri) {
    var response = new Response(this.req, this.res, 202);
    response.addObject(object, uri);
    response.send('Sent (202 ACCEPTED)');
};
