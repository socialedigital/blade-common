var util = require('util');

var inspectOptions = {
    showHidden: false,
    depth: null,
    colors: true
}


function Response(request, response, httpStatusCode) {
    this.req = request;
    this.res = response;
    this.request = request.method + ' ' + request.url;
    this.payload = request.json || request.body
    this.httpStatusCode = httpStatusCode;
    this.sails = this.req._sails;
    this.object = {};
    this.response = {};
}

Response.prototype.addObject = function(object, uri) {
    if (object) {
        this.object = object;
    }
    if (uri) {
        this.res.setHeader("Location", uri);
    }
}

Response.prototype.applyOptions = function(options) {
    var self = this;
    _.forIn(options, function(value, key) {
        switch(key) {
            case 'data':
                self.addData(value);
                break;
            case 'errors':
                self.addErrors(value);
                break;
            case 'links':
                self.addLinks(value);
                break;
            case 'total':
                self.addTotalItems(value);
                break;
            case 'offset':
                self.addOffset(value);
                break;
            case 'limit':
                self.addLimit(value);
                break;
            default:
                self.object = options;
        }
    });
}

Response.prototype.setURI = function(uri) {
    this.response.uri = uri;
}

Response.prototype.addData = function(data) {
    if (_.isArray(data)) {
        this.response.data = data;
    }
    else {
        this.response.data = [data];
    }
}

Response.prototype.addLinks = function(links) {
    var self = this;
    _.forIn(links, function(value, key) {
        switch(key) {
            case 'first':
                self.addFirstLink(value);
                break;
            case 'previous':
            case 'prev':
                self.addPreviousLink(value);
                break;
            case 'next':
                self.addNextLink(value);
                break;
            case 'last':
                self.addLastLink(value);
                break;
        }
    })
}

Response.prototype.addErrors = function(errors) {
    var self = this;

    if (typeof errors == 'string') {
        self.response.error = errors;
    }
    else {
        if (errors && errors instanceof Error) {
            errors.request = self.request;
            errors.payload = self.payload;
            if (process.env.NODE_ENV != 'test') {
                sails.log.error(util.inspect(errors, inspectOptions));
                sails.log.error(errors.stack);
            }
            delete self.request;
            delete self.payload;

            errors.name = errors.name;
            errors.message = errors.message;
            if (errors.stack) {
                if (process.env.NODE_ENV != 'production') {
                    errors.trace = errors.stack.split("\n");
                    self.response.error = errors;
                }
            }
        }
    }
}

Response.prototype.addFirstLink = function(firstLink) {
    if (!this.response.links) {
        this.response.links = {};
    }
    this.response.links.first = firstLink;
}

Response.prototype.addPreviousLink = function(previousLink) {
    if (!this.response.links) {
        this.response.links = {};
    }
    this.response.links.previous = previousLink;
}

Response.prototype.addNextLink = function(nextLink) {
    if (!this.response.links) {
        this.response.links = {};
    }
    this.response.links.next = nextLink;
}

Response.prototype.addLastLink = function(lastLink) {
    if (!this.response.links) {
        this.response.links = {};
    }
    this.response.links.last = lastLink;
}

Response.prototype.addTotalItems = function(totalItems) {
    this.response.total = parseInt(totalItems, 10);
}

Response.prototype.addOffset = function(offset) {
    this.response.offset = parseInt(offset, 10);
}

Response.prototype.addLimit = function(limit) {
    this.response.limit = parseInt(limit, 10);
}

Response.prototype.send = function(logMessage) {
    var self = this;

    var isEmptyResponse = _.isEmpty(self.response) && _.isEmpty(self.object);

    if (!isEmptyResponse) {
        if (!_.isEmpty(self.object)) {
            self.response = self.object;
        }
        else {
            self.response.uri = self.req.path;
            self.response.status = self.httpStatusCode;
            self.response.timestamp = new Date();
        }
    }

    if (!isEmptyResponse) {
        self.req._sails.log.silly(logMessage, self.response);
    }
    else {
        self.req._sails.log.silly(logMessage, "(empty response)");
    }

    self.res.status(self.httpStatusCode);
    if (!isEmptyResponse) {
        self.res.jsonx(self.response);
    }
    else {
        self.res.send();
    }
    sails.config.metrics.httpResponseCounter.increment({
        method: self.req.method,
        url   : self.req.url,
        code  : self.response.status
    });
}

module.exports = Response;
