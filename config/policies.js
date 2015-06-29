
module.exports.policies = {

    AuthenticationController: {
        '*': false,
        authenticate: true,
        resolveCode: 'authPass',
        pwdReset: true,
        pwdCode: 'authPass',
        pwdChange: 'authPass'
    },
    ServiceController: {
        '*': false,
        info: 'serviceRequest',
        metrics: 'serviceRequest'
    }
};
