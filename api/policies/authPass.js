var _ = require('lodash');
module.exports = function(req, res, next) {
    if (!_.isEmpty(req.headers.authorization)) {
        return CacheService.getTimedKey(req.headers.authorization, sails.config.blade.inactivityTimeout)
            .then(function(data) {
                if (!_.isEmpty(data)) {
                    return next();
                } else {
                    return res.unauthorized('You shall not pass.');
                }
            })
            .catch(function(err) {
                return res.unauthorized('You shall not pass.');
            });
    } else {
        return res.badRequest('You shall not pass.');
    }
};