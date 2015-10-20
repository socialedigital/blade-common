var clientError = require('./ClientError.js');
var util = require('util');

function ImATeapot(serviceName, request, response, message) {
    clientError.apply(this, [serviceName, request, response]);
    this.service.response.message = "I'm a Teapot";
    this.name = "I AM A TEAPOT";
    this.status = 418;
}

util.inherits(ImATeapot, clientError);

module.exports = ImATeapot;
