var clientError = require('./ClientError.js');
var util = require('util');

function NotFound(serviceName, request, response, message) {
    if (serviceName == 'QueryService') {        //make this object do double duty
        clientError.call(this);
        this.status = 404;
    }
    else {
        clientError.apply(this, [serviceName, request, response]);
        this.service.response.message = 'Not Found';
    }
    this.name = "NOT FOUND";
    this.status = 404;
}

util.inherits(NotFound, clientError);

module.exports = NotFound;
