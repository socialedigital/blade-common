
module.exports = {
    validAuthParms: function(req) {
        if ((!req.body.hasOwnProperty('email')) ||
            (!req.body.hasOwnProperty('password'))) {
            throw new Error('Authentication credentials incorrect.');
        } else {
            return this;
        }
    },
    lookup: function(req) {
        return Service.request('service.admin').get('/users/' + req.body.email)
            .then(function (results) {
                return results;
            });
    },
    validPassParms: function(req) {
        if (!req.body.hasOwnProperty('email')) {
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
        return Service.request('service.admin')
            .put('/users/' + token,
            {password: pwd});
    }
};

