/**
 * 408 (Request Timeout) Response
 *
 * The server did not receive a complete request message within the time that it was prepared to wait.
 */

var Response = require('../../lib/response.js');

module.exports = function (errors) {
    var response = new Response(this.req, this.res, 408);
    response.addErrors(errors);
    response.send('Sent (408 REQUEST TIMEOUT)');
};
