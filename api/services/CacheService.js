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
    set: function(key, value) {
        return new Promise(function(resolve, reject) {
            Connection.isConnected().then(function() {
                Connection.getClient().then(function(client) {
                    client.setAsync(key, value).then(function() {
                        client.end();
                    });
                });
            }).then(function() {
                resolve();
            });
        });
    },
    /**
     * get -
     * @param key
     * @param value
     * @returns {*|old}
     */
    get: function(key, value) {
        return new Promise(function(resolve, reject) {
            Connection.isConnected().then(function() {
                Connection.getClient().then(function(client) {
                    client.getAsync(key).then(function(data) {
                        client.end();
                        return data;
                    });
                });
            }).then(function(data) {
                resolve(data);
            });
        });
    },
    /**
     * del -
     * @param key
     * @returns {*|old}
     */
    del: function(key) {
        return new Promise(function(resolve, reject) {
            Connection.isConnected().then(function() {
                Connection.getClient().then(function(client) {
                    client.delAsync(key).then(function(data) {
                        client.end();
                    });
                });
            }).then(function() {
                resolve();
            });
        });
    },
    /**
     * hashSet
     * @param key
     * @param field
     * @param value
     * @returns {*|old}
     */
    hashSet: function(key, field, value) {
        return new Promise(function(resolve, reject) {
            Connection.isConnected().then(function() {
                Connection.getClient().then(function(client) {
                    client.hsetAsync(key, field, value).then(function () {
                        client.end();
                    });
                });
            }).then(function() {
                resolve();
            });
        });
    },
    /**
     * hashGet -
     * @param key
     * @param field
     * @returns {*|old}
     */
    hashGet: function(key, field) {
        return new Promise(function(resolve, reject) {
            Connection.isConnected().then(function() {
                Connection.getClient().then(function(client) {
                    client.hgetAsync(key, field).then(function (result) {
                        client.end();
                        return result;
                    });
                });
            }).then(function(data) {
                resolve(data);
            });
        });
    },
    /**
     * hashKeys -
     * @param key
     * @returns {*|old}
     */
    hashKeys: function(key) {
        return new Promise(function(resolve, reject) {
            Connection.isConnected().then(function() {
                Connection.getClient().then(function(client) {
                    client.hkeysAsync(key).then(function (result) {
                        client.end();
                        return result;
                    });
                });
            }).then(function(data) {
                resolve(data);
            });
        });
    },
    /**
     * hashDel -
     * @param key
     * @param field
     * @returns {*|old}
     */
    hashDel: function(key, field) {
        return new Promise(function(resolve, reject) {
            Connection.isConnected().then(function() {
                Connection.getClient().then(function(client) {
                    client.hdelAsync(key, field).then(function (result) {
                        client.end();
                        return result;
                    });
                });
            }).then(function(data) {
                resolve(data);
            });
        });
    },
    /**
     * enQueue - fifo queueing
     * @param key
     * @param object
     * @returns {*|old}
     */
    enQueue: function(key, object) {
        return new Promise(function(resolve, reject) {
            Connection.isConnected().then(function() {
                Connection.getClient().then(function(client) {
                    client.rpushAsync(key, object).then(function (result) {
                        client.end();
                        return result;
                    });
                });
            }).then(function(data) {
                resolve(data);
            });
        });
    },
    /**
     * deQueue - get next queue item
     * @param key
     * @returns {*|old}
     */
    deQueue: function(key) {
        return new Promise(function(resolve, reject) {
            Connection.isConnected().then(function() {
                Connection.getClient().then(function(client) {
                    client.lpopAsync(key).then(function (result) {
                        client.end();
                        return result;
                    });
                });
            }).then(function(data) {
                resolve(data);
            });
        });
    }
};
