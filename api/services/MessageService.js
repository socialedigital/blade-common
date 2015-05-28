/**
 * MessageService.js
 * @description :: allows local service to queue sms text and email messages into core and get feedback async
 * @type {{sendText: Function, sendEmail: Function}}
 */
module.exports = {

    /**
     * sendMessage function
     * @param type - sms or mail
     * @param to - target phone number
     * @param from - phone number of origin
     * @param message - text message
     * @param subject - text for subjet line
     * @returns {string}
     */
    sendMessage: function (type, to, message, from, subject) {
        var messageToSend = {
            serviceType: type,
            messageKey: '', // need a unique key here
            subject: (subject) ? subject : '<empty>',
            from: (from) ? from : '<empty>',
            to: (to) ? to : '<empty>',
            message: (message) ? message : '<empty>'
        };
        return Connection.nextGlobalCounter()
            .then(function (newKey) {
                messageToSend.messageKey = newKey;
                Connection.addHandler(newKey, function (messageKey) {
                    CacheService.hashDelete(messageToSend.serviceType, messageKey).then(function () {
                        Connection.removeHandler(messageKey);
                    });
                });
                return CacheService.hashSet(messageToSend.serviceType, messageToSend.messageKey, JSON.stringify(messageToSend));
            }).then(function () {
                return Service.request('service.core').post('/sendMessage', messageToSend);
            }).then(function (results) {
                return ((results.body) && (results.body !== "")) ? JSON.parse(results.body) : results;
            });
    }
};
