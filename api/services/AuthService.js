var _ = require('lodash');
var bluebird = require('bluebird');
var fs = bluebird.promisifyAll(require('fs'));
var moment = require('moment');
var intform = require('biguint-format');
var FlakeId = require('flake-idgen');
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

module.exports = {

    startAuthentication: function (req, res) {
        var auth = null;
        var authUser = null;
        var reqToken = '';
        return authCheck()
            .then(function(authObj) {
                auth = authObj;
                if ((!req.body.hasOwnProperty('email')) ||
                    (!req.body.hasOwnProperty('password'))) {
                    throw new Error('Authentication credentials incorrect.');
                } else {
                    return auth;
                }
            })// set "auth" var, check parms
            .then(function(authObj) {
                return CacheService.get('blocked-email-' + req.body.email);
            })// good parsm, check blocked
            .then(function (result) {
                if ((result) && (result !== '')) {
                    throw new Error('Email temporarily blocked at ' + result.at);
                } else {
                    return auth.lookup(req);
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
                                if ((data) && (data !== '')) {
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
                                    return CacheService.set('failed-email-' + req.body.email, {count: cnt});
                                }
                            })
                            .then(function () {
                                return Authentication.create({
                                    serviceName: Service.getName(),
                                    bladeToken: authUser.bladeToken,
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
                    bladeToken: authUser.bladeToken,
                    email: req.body.email,
                    authToken: tokens[0],
                    authCode: tokens[1],
                    requestToken: tokens[2],
                    url: req.url
                })
            })// all good, use tokens in auth record
            .then(function (newRecord) {
                return CacheService.setTimedKey(newRecord.requestToken, sails.config.blade.twoFactorCodeTimeout)
                    .then(function(newCode) {
                        reqToken = newCode;
                        return CacheService.setTimedKey(newRecord.authCode, sails.config.blade.twoFactorCodeTimeout);
                    })
            })// set timed keys on 6-digit and authToken
            .then(function (newCode) {
                var msg = {
                    serviceType: authUser.twoFactorMethod,
                    to: authUser.mobile,
                    message: 'Code: ' + newCode
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
                return res.ok(results);
            })// return request token for header.authorization auth resolve call below
            .catch(ServiceError, function(err) {
                return res.serverError(err);
            })
            .catch(BadRequest, function(err) {
                return res.badRequest(new BadRequest("Authentication Start", err));
            })
            .catch(function(err) {
                return res.serverError(err);
            });
    },

    resolveAuthentication: function (req, res) {  // caller should be on authPass, see below and above
        var aCode = req.param('code');
        var rToken = req.headers.authorization;
        CacheService.getTimedKey(rToken, 0)// find token for auth
            .then(function(result) {
                if ((result) && (result !== '')) {
                    return CacheService.getTimedKey(aCode, 0);
                } else {
                    throw new Error('Request token is invalid.');
                }
            })//if good, find code parm
            .then(function (results) {
                if ((results) && (results !== '')) {
                    return Authentication.findOne({requestToken: rToken})
                } else {
                    throw new Error('Code is invalid.');
                }
            })// if good, find auth record
            .then(function (authRecord) {
                return CacheService
                    .setTimedKey(authRecord.authToken, sails.config.blade.inactivityTimeout);
            })// set the timed key for the access token
            .then(function (newKey) {
                return res.json({authToken: newKey});
            })// return new access token to user for subsequent calls in header.authorization
            .catch(function (err) {
                return res.badRequest(new BadRequest("Authentication Resolve",err));
            });
    },

    startPasswordReset: function (req, res) {  // post, no authPass
        var authUser = null;
        var auth = null;
        return authCheck()
            .then(function(authObj) {
                if ((!req.body.hasOwnProperty('email')) ||
                    (!req.body.hasOwnProperty('changeUrl'))) {
                    throw new Error('Authentication credentials incorrect.');
                } else {
                    return authObj;
                }
            })
            .then(function(authObj) {
                auth = authObj;
                return auth.lookup(req);
            })
            .then(function (found) {
                if (found) {
                    authUser = found;
                    return createTokenSet();
                } else {
                    throw new Error('Email not on file for this client.');
                }
            })
            .then(function (tokens) {
                return Authentication.create({
                    serviceName: Service.getName(),
                    bladeToken: authUser.bladeToken,
                    email: req.body.email,
                    mobile: authUser.mobile,
                    authToken: tokens[0],
                    authCode: tokens[1],
                    url: req.body.changeUrl
                });
            })
            .then(function (newRecord) {
                return CacheService.setTimedKey(newRecord.authToken, sails.config.blade.inactivityTimeout);
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
                return res.ok(results);
            })
            .catch(function(err) {
                return res.badRequest(new BadRequest("Password Change start", err));
            });
    },

    sendPasswordCode: function (req, res) {  // get, uses authPass
        Authentication.findOne({authToken: req.headers.authorization})
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
                return res.ok(results);
            })
            .catch(function (err) {
                return res.badRequest(new BadRequest("Password Change code", err));
            })
    },

    resolvePasswordChange: function (req, res) { // put/modify,  uses authPass
        var auth = null;
        var authRec = null;
        return authCheck()
            .then(function(authObj) {
                if (!req.body.hasOwnProperty('password')) {
                    throw new Error('Authentication credentials incorrect.');
                } else {
                    return authObj;
                }
            })
            .then(function(authObj) {
                auth = authObj;
                return CacheService.getTimedKey(req.param('code'), 0);
            })
            .then(function(results) {
                if ((results) && (results !== '')) {
                    return Authentication.findOne({authToken: req.headers.Authentication});
                } else {
                    throw new Error("Code is invalid.");
                }
            })
            .then(function (authRecord) {
                if (authRecord) {
                    authRec = authRecord;
                    var vPwd = require('crypto').createHash('md5').update(req.body.password).digest("hex");
                    return auth.setPassword(authRec.bladeToken, vPwd);
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
                    bladeToken: authRec.bladeToken,
                    email: authRec.email,
                    authToken: tokens[0],
                    authCode: tokens[1]
                });
            })
            .then(function (newAuth) {
                return CacheService.setTimedKey(newAuth.authToken, sails.config.blade.inactivityTimeout);
            })
            .then(function (newKey) {
                return res.ok({authToken: newKey});
            })
            .then(function () {
                return CacheService.delete(authRec.authToken);
            })
            .catch(function (err) {
                return res.badRequest(new BadRequest("Change Password resolve", err));
            });
    }

};
