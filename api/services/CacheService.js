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
            }).then(function (results) {
                cli.end();
                return results;
            });
    },
    /**
     * get -
     * @param key
     * @param value
     * @returns {*|old}
     */
    get: function (key, value) {
        var cli = null;
        return Connection.getClient()
            .then(function (client) {
                cli = client;
                return client.getAsync(key);
            }).then(function(results) {
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
            }).then(function(results) {
                cli.end();
                return results;
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
            }).then(function(results) {
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
            }).then(function(results) {
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
            }).then(function(results) {
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
            }).then(function(results) {
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
            }).then(function(results) {
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
            }).then(function(results) {
                cli.end();
                return JSON.parse(results);
            });
    }
};
