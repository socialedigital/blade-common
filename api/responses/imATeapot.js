/**
 * 418 (I'm a teapot) Response
 *
 * This code was defined in 1998 as one of the traditional IETF April Fools' jokes,
 * in RFC 2324, Hyper Text Coffee Pot Control Protocol, and is not expected to be
 * implemented by actual HTTP servers. However, known implementations do exist.
 * An Nginx HTTP server uses this code to simulate goto-like behaviour in its configuration.
 */

var Response = require('../../lib/response.js');

module.exports = function () {
    var response = new Response(this.req, this.res, 418);
    response.send("Sent (418 I'M A TEAPOT)");
};
