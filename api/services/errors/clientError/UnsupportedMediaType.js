var clientError = require('./ClientError.js');
var util = require('util');

function UnsupportedMediaType(serviceName, request, response, message) {
    clientError.apply(this, [serviceName, request, response]);
    this.service.response.message = 'Unsupported Media Type';
    this.name = "UNSUPPORTED MEDIA TYPE";
    this.status = 415;
}

util.inherits(UnsupportedMediaType, clientError);

module.exports = UnsupportedMediaType;
