
var util = require('util');
var _ = require('lodash');
var Promise = require('bluebird');
var redis = Promise.promisifyAll(require('redis'));
var EventEmitter = require('events').EventEmitter;

var subscribeClient = null;  // master subscribe client for all 'broadcast' from redis, also used for testing connectivity
var redisIP = '';  // ip for redis
var redisPort = 0; // port for redis
var dbArea = 0;    // the redis select(area) for this service
var handlers = {}; // holds dynamic list of functions to call for different message types

function Connection() {
    EventEmitter.call(this);
}

util.inherits(Connection, EventEmitter);

Connection.prototype.initialize = function (cacheConfig) {
    redisPort = cacheConfig.port;
    redisIP = cacheConfig.ip;
};
Connection.prototype.isConnected = function () {
    var self = this;
    return new Promise(function(resolve, reject) {
        if (subscribeClient) {
            resolve();
        } else {
            try {
                if (redisIP === '') {
                    Service.request('service.cache').get('/info').then(function(result) {
                        return JSON.parse(result.body);
                    }).then(function(info) {
                        redisIP = info.cacheConfig.ip;
                        redisPort = info.cacheConfig.port;
                        dbArea = info.bladeServices[Service.getName()];
                    });
                }
                subscribeClient = redis.createClient(redisPort, redisIP, {});
                subscribeClient.on('error', function(err) {
                    sails.log.info('redis connection lost...');
                    reject(err);
                });
                subscribeClient.on('ready', function() {
                    sails.log.info('redis connection ready...');
                    resolve();
                });
                subscribeClient.on('message', self.messageHandler);
                subscribeClient.subscribe('broadcast');
/*
 subscribeClient.on('error', function(err) {
 reject(err);
 });
 subscribeClient.on('ready', function() {
 resolve();
 });
 subscribeClient.on('connect', function() {

 });
 subscribeClient.on('end', function() {

 });
 subscribeClient.on('idle', function() {

 });
 subscribeClient.on('drain', function() {

 });
 subscribeClient.on('reconnecting', function() {

 });
 subscribeClient.on('subscribe', function(channel, count) {

 });
 subscribeClient.on('message', function(channel, message) {

 });
                if (subscribeClient.connected) {
                    resolve();
                } else {
                    subscribeClient = null;
                    reject('Redis is not available.');
                }
*/
            } catch (err) {
                subscribeClient = null;
                reject(err);
            }
        }
    });
};
Connection.prototype.getClient = function () {
    return new Promise(function(resolve, reject) {
        if (subscribeClient) {
            try {
                var cli = redis.createClient(redisPort, redisIP, {});
                cli.on('error', function(err) {
                    sails.log.error('The redis client is not available.');
                    reject(err);
                });
                cli.on('ready', function() {
                    cli.select(dbArea);
                    resolve(cli);
                });
            } catch (err) {
                reject(err);
            }
        } else {
            reject('Not connected.');
        }
    });
};
Connection.prototype.addHandler = function(messageKey, handler) {
    if (!handlers.hasOwnProperty(messageKey)) {
        handlers[messageKey] = handler;
    }
};
Connection.prototype.removeHandler = function(messageKey) {
    if (handlers.hasOwnProperty(messageKey)) {
        delete handlers[messageKey];
    }
};
Connection.prototype.messageHandler = function (channel, messageKey) {
    if (channel === 'broadcast') {
        if (handlers.hasOwnProperty(messageKey)) {
            handlers[messageKey].call(this, messageKey);
        }
    }
};
Connection.prototype.nextGlobalCounter = function() {
    return new Promise(function(resolve, reject) {
        if (subscribeClient) {
            try {
                var cli = redis.createClient(redisPort, redisIP, {});
                cli.on('error', function(err) {
                    reject(err);
                });
                cli.on('ready', function() {
                    cli.selectAsync(0).then(function() {
                        cli.incAsync('GLOBAL_COUNTER').then(function(data) {
                            cli.end();
                            resolve(data);
                        });
                    });
                });
            } catch (err) {
                reject(err);
            }
        } else {
            reject('Not connected.');
        }
    });
};

module.exports = new Connection();