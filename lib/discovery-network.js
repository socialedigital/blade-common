var crypto = require('crypto');
var os = require('os');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('bluebird');
var redis = Promise.promisifyAll(require('redis'));

var procUuid = uuid();
var hostName = process.env.LB_NAME || os.hostname();

console.log('LB_NAME ' + process.env.LB_NAME);
console.log('OS HOSTNAME ' + os.hostname());

module.exports = Network;

function Network(options) {
    if (!(this instanceof Network)) {
        return new Network(options);
    }

    EventEmitter.call(this);

    var self = this, options = options || {};

    self.sails = options.sails;
    self.key = options.key;
    self.instanceUuid = uuid();
    self.processUuid = procUuid;

};

util.inherits(Network, EventEmitter);

Network.prototype.start = function (callback) {
    var self = this;

    try {
        //check to see that redis.port and redis.host have been specified
        if (!sails.config.redis.port && !sails.config.redis.host) {
            throw new Error('REDIS_IP and REDIS_PORT environment variables have not been set');
        }
        if (sails.config.redis.port && !sails.config.redis.host) {
            throw new Error('REDIS_IP environment variable has not been set');
        }
        if (!sails.config.redis.port && sails.config.redis.host) {
            throw new Error('REDIS_PORT environment variable has not been set');
        }

        self.discovery = redis.createClient(sails.config.redis.port, sails.config.redis.host, {});
        self.discovery.on('error', function (err) {
            self.discovery.end();
            callback(err);
        });
        self.discovery.on('ready', function () {
            sails.log.verbose('redis discovery publisher ready');

            self.redisClient = redis.createClient(sails.config.redis.port, sails.config.redis.host, {});
            self.redisClient.on('error', function (err) {
                callback(err);
            });
            self.redisClient.on('ready', function () {
                self.redisClient.subscribe("discovery");
                sails.log.verbose('redis discovery listener ready');

                self.redisClient.on("message", function (channel, message) {
                    if (channel == 'discovery') {
                        self.decode(message, function (err, obj) {
                            if (err) {
                                //most decode errors are because we tried
                                //to decrypt a message for which we do not
                                //have the key

                                self.emit("error", err);
                                sails.log.error(err);
                            }
                            else if (obj.pid == procUuid) {
                                return false;
                            }
                            else if (obj.event && obj.data) {
                                self.emit(obj.event, obj.data, obj);
                            }
                            else {
                                self.emit("message", obj)
                            }
                        });
                    }
                });

                return callback && callback();      //only call the callback if provided
            });
        });
    }
    catch(exception) {
        return callback && callback(exception);
    }
};

Network.prototype.stop = function (callback) {
    var self = this;

    if (self.publish) {
        self.publish.end();
    }
    if (self.redisClient) {
        self.redisClient.end();
    }

    return callback && callback();
};

Network.prototype.send = function (event) {
    var self = this;

    var obj = {
        event : event,
        pid : procUuid,
        iid : self.instanceUuid,
        hostName : hostName
    };

    if (arguments.length == 2) {
        obj.data = arguments[1];
    }
    else {
        //TODO: splice the arguments array and remove the first element
        //setting data to the result array
    }

    self.encode(obj, function (err, contents) {
        if (err) {
            return false;
        }

        var msg = new Buffer(contents);

        self.discovery.publish('discovery', msg);
    });
};

Network.prototype.encode = function (data, callback) {
    var self = this
        , tmp
        ;

    try {
        tmp = (self.key)
            ? encrypt(JSON.stringify(data),self.key)
            : JSON.stringify(data)
        ;
    }
    catch (e) {
        return callback(e, null);
    }

    return callback(null, tmp);
};

Network.prototype.decode = function (data, callback) {
    var self = this
        , tmp
        ;

    try {
        if (self.key) {
            tmp = JSON.parse(decrypt(data.toString(),self.key));
        }
        else {
            tmp = JSON.parse(data);
        }
    }
    catch (e) {
        return callback(e, null);
    }

    return callback(null, tmp);
};

//TODO: this may need to be improved
function uuid() {
    var str = [
        hostName
        , ":"
        , process.pid
        , ":"
        , (+new Date)
        , ":"
        , (Math.floor(Math.random() * 100000000000))
        , (Math.floor(Math.random() * 100000000000))
    ].join('');

    return md5(str);
}

function md5 (str) {
    var hash = crypto.createHash('md5');

    hash.update(str);

    return hash.digest('hex');
};

function encrypt (str, key) {
    var buf = [];
    var cipher = crypto.createCipher('aes256', key);

    buf.push(cipher.update(str, 'utf8', 'binary'));
    buf.push(cipher.final('binary'));

    return buf.join('');
};

function decrypt (str, key) {
    var buf = [];
    var decipher = crypto.createDecipher('aes256', key);

    buf.push(decipher.update(str, 'binary', 'utf8'));
    buf.push(decipher.final('utf8'));

    return buf.join('');
};

