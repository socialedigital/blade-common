var _ = require('lodash');
var bluebird = require('bluebird');
var fs = bluebird.promisifyAll(require('fs'));
var moment = require('moment');
var request = bluebird.promisify(require('request'));

var intform = require('biguint-format');
var FlakeId = require('flake-idgen');

var authy = require('authy')('41f3fe0a27e1c9cba05c30933811a2b8');//test api key

var tokenGen = new FlakeId();
var cyphGen = new FlakeId();

function createTokenSet() {
    var aToken = intform(tokenGen.next(), 'dec');
    var rToken = intform(tokenGen.next(), 'dec');
    var cToken = intform(cyphGen.next(), 'dec');
    cToken = cToken.substr(cToken.length - 6);
    return [aToken, cToken, rToken];
}

function authCheck() {
    if (sails.config.authentication) {
        return bluebird.resolve(sails.config.authentication);
    } else {
        return bluebird.reject('Service cannot authenticate.');
    }
}

function authValid(req) {
    return authCheck()
        .then(function(authObj) {
            if ((!req.body.hasOwnProperty('email')) ||
                (!req.body.hasOwnProperty('password'))) {
                throw new Error('Authentication credentials incorrect.');
            } else {
                return authObj.lookup(req);
            }
        })
        .catch(function(err) {
            sails.log.debug(err);
            throw new Error('Authentication not possible.');
        });
}

module.exports = {
    simpleAuthenticate: function (req, res) {
        var authUser = null;
        return authValid(req)
            .then(function(found) {
                if (found) {
                    authUser = found;
                    var hPwd = require('crypto').createHash('md5').update(req.body.password).digest("hex");
                    if (found.password === hPwd) {
                        return createTokenSet();
                    } else {
                        throw new Error('Authentication password incorrect.');
                    }
                } else {
                    throw new Error('Authentication email not found.');
                }
            })
            .then(function(tokens) {
                return Authentication.create({
                    serviceName: Service.getName(),
                    userToken: authUser.userToken,
                    email: req.body.email,
                    authToken: tokens[0],
                    authCode: tokens[1],
                    requestToken: tokens[2],
                    url: req.url
                })
            })
            .then(function (newRecord) {
                return CacheService
                    .setTimedKey(newRecord.authToken, sails.config.blade.inactivityTimeout, newRecord);
            })
            .then(function(newKey) {
                res.json({authToken: newKey});
            })
            .catch(function(err) {
                res.badRequest(new BadRequest("Authentication Resolve",err));
            });
    },

    removeAuth: function(req, res) {
        return CacheService
            .getTimedKey(req.headers.authorization, 0)
            .then(function(result) {
                res.ok();
            })
            .catch(function(err) {
                res.badRequest(new BadRequest("Authentication Logout",err));
            });
    },

    startAuthentication: function (req, res) {
        var authUser = null;
        var reqToken = '';
        return CacheService.get('blocked-email-' + req.body.email)
            .then(function (result) {
                if ( !_.isEmpty(result) ) {
                    throw new Error('Email temporarily blocked at ' + result.at);
                } else {
                    return authValid(req);
                }
            })//not blocked, find user by email ('lookup' subroutine in service's authentication object)
            .then(function (found) {
                if (found) {
                    authUser = found;
                    var hPwd = require('crypto').createHash('md5').update(req.body.password).digest("hex");
                    if (found.password === hPwd) {
                        return CacheService.delete('failed-email-' + req.body.email)
                            .then(function () {
                                return createTokenSet();
                            });
                    } else {
                        var cnt = 0,
                            isBlocked = false;
                        return CacheService.get('failed-email-' + req.body.email)
                            .then(function (data) {
                                if (!_.isEmpty(data)) {
                                    cnt = data.count;
                                }
                                cnt += 1;
                                if (cnt >= 3) {
                                    return CacheService.delete('failed-email-' + req.body.email)
                                        .then(function () {
                                            isBlocked = true;
                                            return CacheService
                                                .set('blocked-email-' + req.body.email, {at: moment().utc()});
                                        })
                                        .then(function () {
                                            return CacheService
                                                .expireKey('blocked-email-' + req.body.email,
                                                sails.config.blade.blockedEmailTimeout);
                                        });
                                } else {
                                    return CacheService.set('failed-email-' + req.body.email, {count: cnt})
                                        .then(function() {
                                            return CacheService
                                                .expireKey('failed-email-' + req.body.email,
                                                sails.config.blade.blockedEmailTimeout);
                                        })
                                }
                            })
                            .then(function () {
                                return Authentication.create({
                                    serviceName: Service.getName(),
                                    userToken: authUser.userToken,
                                    email: req.body.email,
                                    failedPassword: true,
                                    acctBlocked: isBlocked
                                })
                            })
                            .then(function (newRecord) {
                                throw new Error('Credentials invalid.');
                            })
                    }
                } else {
                    throw new Error('Credentials invalid.');
                }
            })// if email found, do password check and failure subroutine (3 failure block)
            .then(function (tokens) {
                return Authentication.create({
                    serviceName: Service.getName(),
                    userToken: authUser.userToken,
                    email: req.body.email,
                    authToken: tokens[0],
                    authCode: tokens[1],
                    requestToken: tokens[2],
                    url: req.url
                })
            })// all good, use tokens in auth record
            .then(function (newRecord) {
                return CacheService.setTimedKey(newRecord.requestToken, sails.config.blade.twoFactorCodeTimeout, newRecord)
                    .then(function(newCode) {
                        reqToken = newCode;
                        return CacheService.setTimedKey(newRecord.authCode, sails.config.blade.twoFactorCodeTimeout, newRecord);
                    })
            })// set timed keys on 6-digit and authToken
            .then(function (newCode) {
                var msg = {
                    serviceType: authUser.twoFactorMethod,
                    to: authUser.mobile,
                    message: 'Your Sociale Verification Code: ' + newCode
                };
                if (authUser.twoFactorMethod !== 'sms') {
                    msg['to'] = authUser.email;
                    msg['from'] = sails.config.blade.sesSentFromEmail;
                    msg['subject'] = 'Confirmation Code';
                }
                return MessageService.sendMessage(msg);
            })// send 6-digit to user
            .then(function (results) {
                results['requestToken'] = reqToken;
                res.ok(results);
            })// return request token for header.authorization auth resolve call below
            .catch(ServiceError, function(err) {
                res.serverError(err);
            })
            .catch(BadRequest, function(err) {
                res.badRequest(new BadRequest("Authentication Start", err));
            })
            .catch(function(err) {
                res.serverError(err);
            });
    },

    resolveAuthentication: function (req, res) {  // caller should be on authPass, see below and above
        return CacheService.getTimedKey(req.headers.authorization)// find token for auth
            .then(function(result) {
                if (!_.isEmpty(result)) {
                    return CacheService.getTimedKey(req.param('code'), 0);
                } else {
                    throw new Error('Request token is invalid.');
                }
            })//if good, find code parm
            .then(function (results) {
                if (!_.isEmpty(results)) {
                    return Authentication.findOne({requestToken: req.headers.authorization})
                } else {
                    throw new Error('Code is invalid.');
                }
            })// if good, find auth record
            .then(function (authRecord) {
                return CacheService
                    .setTimedKey(authRecord.authToken, sails.config.blade.inactivityTimeout, authRecord);
            })// set the timed key for the access token
            .then(function (newKey) {
                res.json({authToken: newKey});
            })// return new access token to user for subsequent calls in header.authorization
            .catch(function (err) {
                res.badRequest(new BadRequest("Authentication Resolve",err));
            });
    },

    startPasswordReset: function (req, res) {  // post, no authPass
        var authUser = null;
        return authValid(req)
            .then(function (found) {
                if (found) {
                    authUser = found;
                    return createTokenSet();
                } else {
                    throw new Error('Email not on file.');
                }
            })
            .then(function (tokens) {
                return Authentication.create({
                    serviceName: Service.getName(),
                    userToken: authUser.userToken,
                    email: req.body.email,
                    mobile: authUser.mobile,
                    authToken: tokens[0],
                    authCode: tokens[1],
                    url: req.body.changeUrl
                });
            })
            .then(function (newRecord) {
                return CacheService.setTimedKey(newRecord.authToken, sails.config.blade.inactivityTimeout, newRecord);
            })
            .then(function (newKey) {
                return MessageService.sendMessage({
                    serverType: 'mail',
                    to: authUser.email,
                    message: req.body.changeUrl + '/?rcode=' + newKey,
                    from: sails.config.blade.sesSentFromEmail,
                    subject: 'Change Password'
                });
            })
            .then(function (results) {
                res.ok(results);
            })
            .catch(function(err) {
                res.badRequest(new BadRequest("Password Change start", err));
            });
    },

    sendPasswordCode: function (req, res) {  // get, uses authPass
        return Authentication.findOne({authToken: req.headers.authorization})
            .then(function (authRecord) {
                if (authRecord) {
                    return MessageService.sendMessage({
                        serviceType: 'sms',
                        to: authRecord.mobile,
                        message: authRecord.authCode
                    });
                } else {
                    throw new Error('Missing authentication record.');
                }
            })
            .then(function (results) {
                res.ok(results);
            })
            .catch(function (err) {
                res.badRequest(new BadRequest("Password Change code", err));
            })
    },

    resolvePasswordChange: function (req, res) { // put/modify,  uses authPass
        var authRec = null;
        return (req.body.hasOwnProperty('password'))
               ? CacheService.getTimedKey(req.param('code'), 0)
                .then(function(results) {
                    if (!_.isEmpty(results)) {
                        return Authentication.findOne({authToken: req.headers.authorization});
                    } else {
                        throw new Error("Code is invalid.");
                    }
                })
                .then(function (authRecord) {
                    if (authRecord) {
                        authRec = authRecord;
                        var vPwd = require('crypto').createHash('md5').update(req.body.password).digest("hex");
                        return authCheck()
                            .then(function(authObj) {
                                return authObj.setPassword(authRec.userToken, vPwd);
                            });
                    } else {
                        throw new Error('Authentication record not found.');
                    }
                })
                .then(function (result) {
                    if (result) {
                        return createTokenSet();
                    } else {
                        throw new Error('Writing password to account holder failed.');
                    }
                })
                .then(function (tokens) {
                    return Authentication.create({
                        serviceName: Service.getName(),
                        userToken: authRec.userToken,
                        email: authRec.email,
                        authToken: tokens[0],
                        authCode: tokens[1]
                    });
                })
                .then(function (newAuth) {
                    return CacheService.setTimedKey(newAuth.authToken, sails.config.blade.inactivityTimeout, newAuth);
                })
                .then(function (newKey) {
                    res.ok({authToken: newKey});
                })
                .then(function () {
                    return CacheService.delete(authRec.authToken);
                })
                .catch(function (err) {
                    res.badRequest(new BadRequest("Change Password resolve", err));
                })
            : res.badRequest(new BadRequest("Change Password resolve", "Missing new password."));
    },

    startAuthy: function(req, res) {
        //Here are the credentials for Authy
        //Api Key for Production
        //    d8af4dad00d9e9b117f1928e24358771
        //
        //Api Key for Testing
        //    41f3fe0a27e1c9cba05c30933811a2b8
        // expects email
        // auth.lookup on file
        // send sms to user mobile
        // return ?
        var authUser = null;
        return authValid(req)
            .then(function(found) {
                if (found) {
                    authUser = found;
                    if (authUser.authID > 0) {
                        return authUser;
                    } else {
                        // register and save new user id
                        authy.register_user(email, phone, function(err, res) {
                            if (err) {
                                throw new Error('Could not register user with Authy.');
                            } else {
                                return authCheck()
                                    .then(function(authObj) {
                                        return authObj.setExternalID(authUser.userToken, 'authyID', res.user.id);
                                    })
                                    .catch(function(err) {
                                        throw new Error('Could not set Authy user ID.');
                                    });
                            }
                        });
                    }
                } else {
                    throw new Error("Email not on file.");
                }
            })
            .then(function() {
                authy.request_sms(userID, function(err, res) {
                    if (err) {
                        throw new Error('Authy SMS request failed.');
                    } else {
                        sails.log.info(res);
                        return res;
                    }
                });
            })
            .then(function() {

            })
            .catch(function(err) {
                res.badRequest(err);
            });
    },

    resolveAuthy: function(req, res) {
        // get code
        // authy verify
        //
        var authUser = null;
        return
    }
};