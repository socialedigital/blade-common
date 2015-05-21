var Promise = require('bluebird');
var ServiceDiscovery = require('node-discover');
var discovery = require('../../lib/discovery.js');
var request = require('../../lib/request.js');

var serviceCall = function(serviceName) {
    var service = discovery.getService(serviceName);

    var serviceNotAvailable = function() {
        return Promise.reject('Service ' + serviceName + ' is not available.');
    }
    return {
        get   : function (path) {
            if (service) {
                return request({
                    method: 'GET',
                    host: service.ip,
                    port: service.port,
                    path: path
                });
            }
            else {
                return serviceNotAvailable();
            }
        },
        put   : function (path, data) {
            if (service) {
                return request({
                    method: 'PUT',
                    host: service.ip,
                    port: service.port,
                    path: path,
                    data: data
                });
            }
            else {
                return serviceNotAvailable();
            }
        },
        post  : function (path, data) {
            if (service) {
                return request({
                    method: 'POST',
                    host: service.ip,
                    port: service.port,
                    path: path,
                    data: data
                });
            }
            else {
                return serviceNotAvailable();
            }
        },
        delete: function (path) {
            if (service) {
                return request({
                    method: 'DELETE',
                    host: service.ip,
                    port: service.port,
                    path: path
                });
            }
            else {
                return serviceNotAvailable();
            }
        }
    }
}

module.exports = {
    register: function(serviceOptions) {
        return discovery.register(serviceOptions);
    },

    request: function(serviceName) {
        return serviceCall(serviceName);
    },

    mocks: {
        add: discovery.addMock
    }
};