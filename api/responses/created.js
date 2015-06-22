/**
 * 201 (Created) Response
 *
 * The request has been fulfilled and resulted in a new resource being created.
 * Successful creation occurred (via either POST or PUT).
 * Set the Location header to contain a link to the newly-created resource (on POST).
 * Response body content may or may not be present.
 */

var Response = require('../../lib/response.js');

module.exports = function (object, uri) {
    var response = new Response(this.req, this.res, 201);
    response.addObject(object, uri);
    response.send('Sent (201 CREATED)');
};
