module.exports = function(req, res, next) {
    //check for custom header 'X-Blade-Service-Request'

    if (!req.headers.hasOwnProperty('x-blade-service')) {
        res.status(404).send('');
    }
    else {
        next();
    }
};