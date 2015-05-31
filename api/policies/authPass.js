
module.exports = function(req, res, next) {
    // get auth token from req?
    // lookup auth token in redis
    // if found rewrite timer
    // write authentication record
    // return next()

    return (req.headers.authentication === 'ecdf6e5bd244cfbb4a45d6259eeb7424')  // for inter-service passage
        ? next()
        : CacheService.getTimedKey(req.headers.authentication, (60 * 15))
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

