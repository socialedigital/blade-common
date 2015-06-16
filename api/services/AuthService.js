var _ = require('lodash');
var moment = require('moment');
var intform = require('biguint-format');
var FlakeId = require('flake-idgen');
var tokenGen = new FlakeId();
var cyphGen = new FlakeId();

/**
 *
 * Service.getName() = will return the currently running service
 * This should be used to determine the password lookup/reset data source
 * e.g., ui-service is using the client accountholders for lookup and reset (hard-coded below right now)
 * admin would be using something else, like a bladeUser table
 *
 * the lookup record should have fields:  email, mobile, bladeToken, twoFactorMethod
 *
 */

module.exports = {

    startAuthentication: function (req, res) {
        if (req.param('client_id')) {
            if ((req.body.user) && (req.body.password)) {
                var acctHolder = null;
                CacheService.get('blocked-email-' + req.body.user)
                    .then(function (result) {
                        if ((result) && (result !== '')) {
                            throw new Error('Email temporarily blocked at ' + result.at);
                        } else {
                            /**
                             * here is the request and find information for the email, password
                             */
                            return Service.request('service.client')
                                .get('/clients/' + req.param('client_id') + '/accountholders');
                        }
                    })
                    .then(function (result) {
                        return _.find(JSON.parse(result.body).data, function (obj) {
                            return (obj.email === req.body.user);
                        });
                    })
                    .then(function (found) {
                        if (found) {
                            acctHolder = found;
                            var hPwd = require('crypto').createHash('md5').update(req.body.password).digest("hex");
                            if (found.password === hPwd) {
                                var aToken = intform(tokenGen.next(), 'dec');
                                var cToken = intform(cyphGen.next(), 'dec');
                                cToken = cToken.substr(cToken.length - 6);
                                return CacheService.delete('failed-email-' + req.body.user)
                                    .then(function () {
                                        return [aToken, cToken];
                                    });
                            } else {
                                var cnt = 0,
                                    isBlocked = false;
                                return CacheService.get('failed-email-' + req.body.user)
                                    .then(function (data) {
                                        if ((data) && (data !== '')) {
                                            cnt = data.count;
                                        }
                                        cnt += 1;
                                        if (cnt >= 3) {
                                            return CacheService.delete('failed-email-' + req.body.user)
                                                .then(function () {
                                                    isBlocked = true;
                                                    return CacheService
                                                        .set('blocked-email-' + req.body.user, {at: moment().utc()});
                                                })
                                                .then(function () {
                                                    return CacheService
                                                        .expireKey('blocked-email-' + req.body.user,
                                                        sails.config.blade.blockedEmailTimeout);
                                                });
                                        } else {
                                            return CacheService.set('failed-email-' + req.body.user, {count: cnt});
                                        }
                                    })
                                    .then(function () {
                                        return Authentication.create({
                                            serviceName: Service.getName(),
                                            bladeToken: acctHolder.bladeToken,
                                            email: req.body.user,
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
                    })
                    .then(function (tokens) {
                        return Authentication.create({
                            serviceName: Service.getName(),
                            bladeToken: acctHolder.bladeToken,
                            email: req.body.user,
                            authToken: tokens[0],
                            authCode: tokens[1],
                            url: req.url
                        })
                    })
                    .then(function (newRecord) {
                        return CacheService.setTimedKey(newRecord.authCode, sails.config.blade.twoFactorCodeTimeout);
                    })
                    .then(function (newCode) {
                        var msg = {
                            serviceType: acctHolder.twoFactorMethod,
                            to: acctHolder.mobile,
                            message: 'Code: ' + newCode
                        };
                        if (acctHolder.twoFactorMethod !== 'sms') {
                            msg['to'] = acctHolder.email;
                            msg['from'] = 'no-reply@bladepayments.com';
                            msg['subject'] = 'Confirmation Code';
                        }
                        return MessageService.sendMessage(msg);
                    })
                    .then(function (results) {
                        return res.json(results);
                    })
                    .catch(function (err) {
                        return res.badRequest(err);
                    });
            } else {
                return res.badRequest('Missing credentials.');
            }
        } else {
            return res.badRequest('Missing client id.');
        }
    },

    resolveAuthentication: function (req, res) {
        var aCode = req.param('code');
        if (aCode) {
            CacheService.getTimedKey(aCode, 0)
                .then(function (results) {
                    if ((results) && (results !== '')) {
                        return Authentication.findOne({authCode: aCode})
                            .then(function (authRecord) {
                                return CacheService
                                    .setTimedKey(authRecord.authToken, sails.config.blade.inactivityTimeout);
                            })
                            .then(function (newKey) {
                                return res.json({authToken: newKey});
                            })
                            .catch(function (err) {
                                return res.badRequest(err);
                            });
                    } else {
                        return res.badRequest('Code is invalid.');
                    }
                })
        } else {
            return res.badRequest('Code is missing.');
        }
    },

    startPasswordReset: function (req, res) {  // post, no authPass
        if (req.param('client_id')) {
            if (req.body.email) {
                var acctHolder = null;
                Service.request('service.client').get('/clients/' + req.param('client_id') + '/accountholders')
                    .then(function (result) {
                        return _.find(JSON.parse(result.body).data, function (obj) {
                            return (obj.email === req.body.email);
                        });
                    })
                    .then(function (found) {
                        if (found) {
                            acctHolder = found;
                            var aToken = intform(tokenGen.next(), 'dec');
                            var cToken = intform(cyphGen.next(), 'dec');
                            cToken = cToken.substr(cToken.length - 6);
                            return [aToken, cToken];
                        } else {
                            throw new Error('Email not on file for this client.');
                        }
                    })
                    .then(function (tokens) {
                        return Authentication.create({
                            serviceName: Service.getName(),
                            bladeToken: acctHolder.bladeToken,
                            clientID: req.param('client_id'),
                            email: req.body.email,
                            mobile: acctHolder.mobile,
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
                            to: acctHolder.email,
                            message: req.body.changeUrl + '/?rcode=' + newKey,
                            from: 'no-reply@bladepayments.com',
                            subject: 'Change Password'
                        });
                    })
                    .then(function (results) {
                        return res.json(results);
                    })
                    .catch(function (err) {
                        return res.badRequest(err);
                    });
            } else {
                return res.badRequest('Missing email to find.');
            }
        } else {
            return res.badRequest('Missing client id.');
        }
    },

    sendPasswordCode: function (req, res) {  // get, uses authPass
        Authentication.findOne({authToken: req.headers.Authentication})
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
                return res.json(results);
            })
            .catch(function (err) {
                return res.badRequest(err);
            })
    },

    resolvePasswordChange: function (req, res) { // put/modify,  uses authPass
        if (req.param('code')) {
            var authRec = null;
            Authentication.findOne({authCode: req.param('code')})
                .then(function (authRecord) {
                    if (authRecord) {
                        authRec = authRecord;
                        var vPwd = require('crypto').createHash('md5').update(req.body.password).digest("hex");
                        return Service.request('service.client')
                            .put('/clients/' + authRecord.clientID + '/accountHolders/' + authRecord.bladeToken,
                            {password: vPwd});
                    } else {
                        throw new Error('Authentication record not found.');
                    }
                })
                .then(function (result) {
                    if (result.hasOwnProperty('data')) {
                        var aToken = intform(tokenGen.next(), 'dec');
                        var cToken = intform(cyphGen.next(), 'dec');
                        cToken = cToken.substr(cToken.length - 6);
                        return [aToken, cToken];
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
                    return res.json({authToken: newKey});
                })
                .then(function () {
                    return CacheService.delete(authRec.authToken);
                })
                .catch(function (err) {
                    return res.badRequest(err);
                })
        } else {
            return res.badRequest('Missing code.');
        }
    }

};
