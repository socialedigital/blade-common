/**
 * 409 (Conflict) Response
 *
 * The request could not be completed due to a conflict with the current state of the target resource.
 * This code is used in situations where the user might be able to resolve the conflict and resubmit the request.
 */

var Response = require('../../lib/response.js');

module.exports = function (errors) {
    var response = new Response(this.req, this.res, 409);
    response.addErrors(errors);
    response.send('Sent (409 CONFLICT)');
};
