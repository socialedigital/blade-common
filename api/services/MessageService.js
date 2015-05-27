/**
 * MessageService.js
 * @description :: allows local service to queue sms text and email messages into core and get feedback async
 * @type {{sendText: Function, sendEmail: Function}}
 */
module.exports = {

    /**
     * sendMessage function
     * @param type - text or mail
     * @param from - phone number of origin
     * @param to - target phone number
     * @param message - text message
     * @returns {string}
     */
    sendMessage: function (type, from, to, message) {
        var messageToSend = {
            serviceType: type + 'Service',
            messageKey: '123', // need a unique key here
            from: from,
            to: to,
            body: message
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
                return JSON.parse(results.body);
            });
    }
};
