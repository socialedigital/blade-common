var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
/**
 * CacheService.js - provides cache read/write, and publish/subscribe through redis
 * @type {{set: Function, get: Function, hashSet: Function, hashGet: Function, hashKeys: Function}}
 */
module.exports = {
    /**
     * set -
     * @param key
     * @param value
     * @returns {*|old}
     */
    set: function (key, value) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.setAsync(key, JSON.stringify(value));
            })
            .then(function (results) {
                cli.end();
                return results;
            });
    },
    /**
     * get -
     * @param key
     * @returns {*|old}
     */
    get: function (key) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.getAsync(key);
            })
            .then(function (results) {
                cli.end();
                return JSON.parse(results);
            });
    },
    /**
     * delete -
     * @param key
     * @returns {*|old}
     */
    delete: function (key) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.delAsync(key);
            })
            .then(function (results) {
                cli.end();
                return results;
            });
    },

    /**
     * expireKey - set a key to expire and delete itself
     * @param key
     * @param seconds
     */
    expireKey: function(key, seconds) {
        var cli = null;
        return Connection.getClient()
            .then(function(client) {
                cli = client;
                return cli.expireAsync(key, seconds);
            })
            .then(function() {
                cli.end();
                return key;
            });
    },

    /**
     * hashSet
     * @param key
     * @param field
     * @param value
     * @returns {*|old}
     */
    hashSet: function (key, field, value) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.hsetAsync(key, field, JSON.stringify(value));
            })
            .then(function (results) {
                cli.end();
                return results;
            });
    },
    /**
     * hashGet -
     * @param key
     * @param field
     * @returns {*|old}
     */
    hashGet: function (key, field) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.hgetAsync(key, field);
            })
            .then(function (results) {
                cli.end();
                return JSON.parse(results);
            });
    },
    /**
     * hashKeys -
     * @param key
     * @returns {*|old}
     */
    hashKeys: function (key) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.hkeysAsync(key);
            })
            .then(function (results) {
                cli.end();
                return results;
            });
    },
    /**
     * hashDelete -
     * @param key
     * @param field
     * @returns {*|old}
     */
    hashDelete: function (key, field) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.hdelAsync(key, field);
            })
            .then(function (results) {
                cli.end();
                return results;
            });
    },
    /**
     * enQueue - fifo queueing
     * @param key
     * @param object
     * @returns {*|old}
     */
    enQueue: function (key, object) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.rpushAsync(key, JSON.stringify(object));
            })
            .then(function (results) {
                cli.end();
                return results;
            });
    },
    /**
     * deQueue - get next queue item
     * @param key
     * @returns {*|old}
     */
    deQueue: function (key) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.lpopAsync(key);
            })
            .then(function (results) {
                cli.end();
                return JSON.parse(results);
            });
    },
    /**
     * setTimedKey - set up a timed secret code for sending to logged in
     * @param key
     * @param timeout - ttl for the key
     */
    setTimedKey: function(key, timeout) {
        var cli = null;
        return Connection.getClient()
            .then(function(client) {
                cli = client;
                return cli.setAsync(key, moment().utc());
            })
            .then(function() {
                return cli.expireAsync(key, timeout);
            })
            .then(function() {
                cli.end();
                return key;
            });
    },
    /**
     * getTimedKey - get a timer key from root and reset its timeout (act of reading restores timeout)
     * @param key
     * @param timeout
     */
    getTimedKey: function(key, timeout) {
        var cli = null,
            retdata = null;
        return Connection.getClient()
            .then(function(client) {
                cli = client;
                return cli.getAsync(key);
            })
            .then(function(data) {
                retdata = data;
                if ((!_.isEmpty(retdata)) && (timeout > 0)) {
                    return cli.setAsync(key, moment().utc());
                } else {
                    return cli.delAsync(key);
                }
            })
            .then(function() {
                if ((!_.isEmpty(retdata)) && (timeout > 0)) {
                    return cli.expireAsync(key, timeout);
                } else {
                    Promise.resolve();
                }
            })
            .then(function() {
                cli.end();
                return retdata;
            });
    }
};
