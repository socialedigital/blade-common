
var url = require('url');


function Response(request, response, httpStatusCode) {
    this.req = request;
    this.res = response;
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
    if (_.isArray(errors)) {
        self.response.errors = [];
        _.each(errors, function(error) {
            var responseError = {
                code: error.name,
                title: error.message,
            };
            if (error.description) {
                responseError.description = error.description;
            }
            self.response.errors.push(responseError);
        });
    }
    else {
        self.response.errors = {};
        if (typeof errors == 'string') {
            self.response.errors.description = errors;
        }
        else {
            if (errors.name) {
                self.response.errors.code = errors.name;
            }
            if (errors.message) {
                self.response.errors.title = errors.message;
            }
            if (errors.description) {
                self.response.errors.description = errors.description;
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
    if (self.req._sails.config.environment === 'production') {
        //remove any stack traces or debugging information from the response
    }
    var isEmptyResponse = _.isEmpty(self.response) && _.isEmpty(self.object);

    if (!isEmptyResponse) {
        self.res.setHeader("Content-Type", "application/json; charset=utf-8");
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
