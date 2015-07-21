/**
 * 200 (OK) Response
 *
 * General status code. Most common code used to indicate success.
 * The actual response will depend on the request method used.
 * In a GET request, the response will contain an entity corresponding to the requested resource.
 * In a POST request the response will contain an entity describing or containing the result of the action.
 */

var Response = require('../../lib/response.js');

module.exports = function(options) {
    var response = new Response(this.req, this.res, 200);
    if(options){
        options = QueryService.formatResponse(this.req, options);
    }
    response.applyOptions(options);
    response.send('Sent (200 OK)');
};
