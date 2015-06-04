
module.exports = function(req, res, next) {
    // get auth token from req?
    // lookup auth token in redis
    // if found rewrite timer
    // write authentication record
    // return next()

    return CacheService.getTimedKey(req.headers.Authorization, sails.config.blade.inactivityTimeout)
        .then(function(data) {
            if ((data) && (data !== '')) {
                return next();
            } else {
                return res.forbidden('You shall not pass.');
            }
        })
        .catch(function(err) {
            return res.forbidden('You shall not pass.');
        });
};