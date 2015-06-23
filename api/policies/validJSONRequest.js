/**
 * validJSONRequest
 *
 * @module      :: Policy
 * @description :: Simple policy to allow any authenticated user
 *                 Assumes that your login action in one of your controllers sets `req.session.authenticated = true;`
 *
 */
module.exports = function validJSONRequest (req, res, next) {
    var requestType = req.get('Content-Type');

    if (requestType !== 'application/json') {
        return res.badRequest();
    }
    else {
        return next();
    }
}
