var _ = require('lodash');

module.exports = {
    validAuthParms: function(req) {
        if ((!req.param('client_id')) ||
            (!req.body.hasOwnProperty('email')) ||
            (!req.body.hasOwnProperty('password'))) {
            throw new Error('Authentication credentials incorrect.');
        } else {
            return this;
        }
    },
    lookup: function(req) {
        return Service.request('service.client').get('/clients/' + req.param('client_id') + '/accountholders')
            .then(function (results) {
                return _.find(results.data, function (obj) {
                    return (obj.email === req.body.email);
                });
            });
    },
    validPassParms: function(req) {
        if ((!req.param('client_id')) ||
            (!req.body.hasOwnProperty('email'))) {
            throw new Error('Authentication credentials incorrect.');
        } else {
            return this;
        }
    },
    validPassResolve: function(req) {
        if ((!req.param('code')) ||
            (!req.body.hasOwnProperty('password'))) {
            throw new Error('Authentication credentials incorrect.');
        } else {
            return this;
        }
    },
    setPassword: function(token, pwd) {
        return Service.request('service.client')
            .put('/accountHolders/' + token + '/verifiedUpdates',
            {password: pwd});
    }
};
