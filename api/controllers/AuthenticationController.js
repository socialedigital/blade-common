
module.exports = {
    authenticate: function (req, res) {
        AuthService.startAuthentication(req, res);
    },
    resolveCode: function (req, res) {
        AuthService.resolveAuthentication(req, res);
    },
    pwdReset: function (req, res) {
        AuthService.startPasswordReset(req, res);
    },
    pwdCode: function (req, res) {
        AuthService.sendPasswordCode(req, res);
    },
    pwdChange: function (req, res) {
        AuthService.resolvePasswordChange(req, res);
    },
    simpleAuth: function(req, res) {
        AuthService.simpleAuthenticate(req, res);
    },
    logout: function(req, res) {
        AuthService.removeAuth(req, res);
    }
};