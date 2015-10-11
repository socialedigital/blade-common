var util = require('util');
var _ = require('lodash');
var Promise = require('bluebird');
var redis = Promise.promisifyAll(require('redis'));
var EventEmitter = require('events').EventEmitter;

var subscribeClient = null;  // master subscribe client for all 'broadcast' from redis, also used for testing connectivity
var expiredClient = null;
var redisIP = '';  // ip for redis
var redisPort = 0; // port for redis
var dbArea = 0;    // the redis select(area) for this service
var handlers = {}; // holds dynamic list of functions to call for different message types
var expiredHandlers = {};
var serviceAreas = {
    //"service.cache":0,
    "service.core":1,
    "service.client":2,
    "service.ui":3,
    "service.transaction":4,
    "service.fx":5,
    "service.admin":7,
    "service.image":8,
    "adapter.ui":9,
    "service.api":10,
    "adapter.wavecrest":11,
    "service.block":12,
    "adapter.admin":13
};
function Connection() {
    EventEmitter.call(this);
}

function setConfig() {
    redisIP = sails.config.redis.host;
    redisPort = sails.config.redis.port;
    dbArea = serviceAreas[Service.getName()];
    return Promise.resolve();
}
function makeClient() {
    return new Promise(function (resolve, reject) {
        try {
            var newClient = redis.createClient(redisPort, redisIP, {});
            newClient.on('error', function (err) {
                reject(err);
            });
            newClient.on('ready', function () {
                resolve(newClient);
            });
        } catch (err) {
            reject(err);
        }
    });
}
util.inherits(Connection, EventEmitter);

Connection.prototype.initialize = function (cacheConfig) {
    if (cacheConfig) {
        redisPort = cacheConfig.port;
        redisIP = cacheConfig.ip;
    }
};
Connection.prototype.isConnected = function () {
    return (!subscribeClient)
        ? makeClient()
        .then(function (client) {
            subscribeClient = client;
            subscribeClient.on('error', function (err) {
                sails.log.error('redis connection for subscriptions not available...');
            });
            subscribeClient.on('message', function (channel, messageKey) {
                if (channel === 'broadcast') {
                    if (handlers.hasOwnProperty(messageKey)) {
                        handlers[messageKey].call(this, messageKey);
                    }
                }
            });
            subscribeClient.subscribe('broadcast');
            return true;
        })
        .then(makeClient)
        .then(function(client) {
            expiredClient = client;
            expiredClient.on('error', function(err) {
                sails.log.error('redis connection for expireds not available...');
            });
            expiredClient.on('pmessage', function(pattern, channel, message) {
                var channelSp = channel.split(':');
                var areaSp = channelSp[0].split('@');
                var area = parseInt(areaSp[1].replace('__', ''), 10);
                if (area === dbArea) {
                    if ((message === 'expired') && (!_isEmpty(expiredHandlers[channelSp[1]]))) {
                        expiredHandlers[channelSp[1]].call(this, message);
                    }
                }
            });
            expiredClient.psubscribe('__key*__:*');
            return true;
        })
        .catch(function (err) {
            subscribeClient = null;
            throw err;
        })
        : Promise.resolve();
};
Connection.prototype.getClient = function () {
    var self = this;
    return setConfig()
        .then(self.isConnected)
        .then(makeClient)
        .then(function (client) {
            client.select(dbArea);
            return client;
        });
};
Connection.prototype.addHandler = function (messageKey, handler) {
    if (!handlers.hasOwnProperty(messageKey)) {
        handlers[messageKey] = handler;
    }
};
Connection.prototype.removeHandler = function (messageKey) {
    if (handlers.hasOwnProperty(messageKey)) {
        delete handlers[messageKey];
    }
};
Connection.prototype.addExpiredHandler = function(key, handler) {
    if (!expiredHandlers.hasOwnProperty(key)) {
        expiredHandlers[key] = handler;
    }
};
Connection.prototype.removeExpiredHandler = function(key) {
    if (expiredHandlers.hasOwnProperty(key)) {
        delete expiredHandlers[key];
    }
};

Connection.prototype.nextGlobalCounter = function () {
    var cli = null;
    return makeClient()
        .then(function (client) {
            cli = client;
            return client.selectAsync(0);
        })
        .then(function () {
            return cli.incrAsync('GLOBAL_COUNTER');
        })
        .then(function (data) {
            cli.end();
            return data;
        })
        .catch(function(err) {
            if (cli) {
                cli.end();
            }
            throw err;
        });
};

module.exports = new Connection();