var moment = require('moment');
var _ = require('lodash');
var Promise = require('bluebird');
/**
 * CacheService.js - provides cache read/write, and publish/subscribe through redis
 * @type {{set: Function, get: Function, hashSet: Function, hashGet: Function, hashKeys: Function}}
 *
 * Each of the exported functions assumes that you are passing either a string or an simple javascript
 * object (i.e.: { foo: "bar", bar: "bat", foobar: "foobarbat" }) for the value.  If you pass anything other
 * than a string or simple object for the value, this will cause the promise to fail (reject) and you will have
 * to catch the error outside of this module's methods.
 */

function getRedisClient() {
    return Connection.getClient().disposer(function(client) {
        client.end();
    });
}

module.exports = {
    /**
     * set -
     * @param key
     * @param value
     * @returns {*|old}
     */
    set   : function (key, value) {
        return Promise.using(getRedisClient(), function (redis) {
            var keyValue = _.isString(value) ? value : JSON.stringify(value);
            return redis.setAsync(key, keyValue);
        });
    },

    /**
     * get -
     * @param key
     * @returns {*|old}
     */
    get   : function (key) {
        return Promise.using(getRedisClient(), function (redis) {
            return redis.getAsync(key);
        }).then(function (value) {
            try {
                value = JSON.parse(value);
            } catch (error) {
                //not JSON
            }
            return value;
        });
    },

    /**
     * delete -
     * @param key
     * @returns {*|old}
     */
    delete: function (key) {
        return Promise.using(getRedisClient(), function (redis) {
            return redis.delAsync(key);
        });
    },

    /**
     * expireKey - set a key to expire and delete itself
     * @param key
     * @param seconds
     */
    expireKey: function (key, seconds) {
        return Promise.using(getRedisClient(), function (redis) {
            return redis.expireAsync(key, seconds);
        });
    },

    /**
     * hashSet
     * @param key
     * @param field
     * @param value
     * @returns {*|old}
     */
    hashSet    : function (key, field, value) {
        return Promise.using(getRedisClient(), function (redis) {
            var fieldValue = _.isString(value) ? value : JSON.stringify(value);
            return redis.hsetAsync(key, field, fieldValue);
        });
    },

    /**
     * hashGet -
     * @param key
     * @param field
     * @returns {*|old}
     */
    hashGet    : function (key, field) {
        return Promise.using(getRedisClient(), function (redis) {
            return redis.hgetAsync(key, field);
        }).then(function (value) {
            try {
                value = JSON.parse(value);
            } catch (error) {
                //not JSON
            }
            return value;
        });
    },

    /**
     * hashKeys -
     * @param key
     * @returns {*|old}
     */
    hashKeys   : function (key) {
        return Promise.using(getRedisClient(), function (redis) {
            return redis.hkeysAsync(key);
        });
    },

    /**
     * hashDelete -
     * @param key
     * @param field
     * @returns {*|old}
     */
    hashDelete : function (key, field) {
        return Promise.using(getRedisClient(), function (redis) {
            return redis.hdelAsync(key, field);
        });
    },

    sortedSetAdd: function(key, field, score) {
        return Promise.using(getRedisClient(), function (redis) {
            return redis.zaddAsync(key, score, field);
        });
    },
    sortedSetDelete: function(key, field){
        return Promise.using(getRedisClient(), function (redis) {
            return redis.zremAsync(key, field);
        });
    },
    sortedSetGet: function(key, opts){
        var rangeStart = 0;
        var rangeEnd = -1;
        if(!opts){
            opts = {};
        }
        if(opts.range){
            try{
                rangeStart = opts.range[0];
                rangeEnd = opts.range[1];
            } catch(err) {
                throw "Incorrect range specified"
            }
        }
        return Promise.using(getRedisClient(), function (redis) {
            if(opts.withscores === true){
                return redis.zrangeAsync(key, rangeStart, rangeEnd, "WITHSCORES");
            } else {
                return redis.zrangeAsync(key, rangeStart, rangeEnd);
            }
        });
    },

    listGet: function(key, opts){
        var rangeStart = 0;
        var rangeEnd = -1;
        if(!opts){
            opts = {};
        }
        if(opts.range){
            try{
                rangeStart = opts.range[0];
                rangeEnd = opts.range[1];
            } catch(err) {
                throw "Incorrect range specified"
            }
        }
        return Promise.using(getRedisClient(), function (redis) {
            return redis.lrangeAsync(key, rangeStart, rangeEnd);
        });
    },
    /**
     * enQueue - fifo queueing
     * @param key
     * @param object
     * @returns {*|old}
     */
    enQueue    : function (key, object) {
        return Promise.using(getRedisClient(), function (redis) {
            var queuedValue = _.isString(object) ? object : JSON.stringify(object);
            return redis.rpushAsync(key, queuedValue);
        });
    },

    /**
     * deQueue - get next queue item
     * @param key
     * @returns {*|old}
     */
    deQueue    : function (key) {
        return Promise.using(getRedisClient(), function (redis) {
            return redis.lpopAsync(key);
        }).then(function (value) {
            try {
                value = JSON.parse(value);
            } catch (error) {
                //not JSON
            }
            return value;
        });
    },

    /**
     * setTimedKey - set up a timed secret code for sending to logged in
     * @param key
     * @param timeout - ttl for the key (0 to remove)
     * @param object - value to store (optional)
     */
    setTimedKey: function (key, timeout, object) {
        if (timeout == 0) {
            return this.deleteTimedKey(key).then(function() {
                return key;
            });
        }
        else {
            return Promise.using(getRedisClient(), function (redis) {
                var keyValue = _.isString(object) ? object : JSON.stringify(object);
                return redis.setAsync(key, keyValue).then(function () {
                    return redis.expireAsync(key, timeout).then(function() {
                        return key;
                    });
                })
            });
        };

    },

    /**
     * getTimedKey - get a timer key from root and reset its timeout (act of reading restores timeout)
     * @param key
     * @param timeout - ttl for the key (0 to remove)
     */
    getTimedKey: function (key, timeout) {
        return Promise.using(getRedisClient(), function (redis) {
            return redis.getAsync(key)
            .then(function(value) {
                //if (timeout == 0) {
                //    this.deleteTimedKey(key);
                //}
                //else {
                //    redis.expireAsync(key, timeout);
                //}
                redis.expireAsync(key, timeout);
                try {
                    value = JSON.parse(value);
                } catch (error) {
                    //not JSON
                }
                return value;
            })
        });
    },

    /**
     * deleteTimedKey - delete a timed key
     * @param key
     */
    deleteTimedKey: function (key) {
        return Promise.using(getRedisClient(), function(redis) {
            return redis.expireAsync(key, 0);
        })
    },

    /**
     * ttl - time to live for a key
     * @param key
     */
    ttl: function (key) {
        return Promise.using(getRedisClient(), function(redis) {
            return redis.ttlAsync(key);
        })
    },

}
