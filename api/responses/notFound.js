/**
 * 404 (Not Found) Response
 *
 * The requested resource could not be found but may be available again in the future.
 * Subsequent requests by the client are permissible.
 * Used when the requested resource is not found, whether it doesn't exist.
 */

var Response = require('../../lib/response.js');

module.exports = function (object) {
    var response = new Response(this.req, this.res, 404);
    if (object && !(object instanceof NotFound)) {
        response.addObject(object);
    }
    response.send('Sent (404 NOT FOUND)');
};
