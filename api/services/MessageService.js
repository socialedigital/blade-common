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
    sendMessage: function(type, from, to, message) {
        var messageToSend = {
            serviceType: type + 'Service',
            messageKey: '123', // need a unique key here
            from: from,
            to: to,
            body: message
        };
        Connection.nextGlobalCounter().then(function(counter) {
            messageToSend.messageKey = counter;
        }).then(function() {
            CacheService.hashGet(serviceType, messageToSend.messageKey).then(function(data) {
                if (!data) {
                    Connection.addHandler(messageToSend.messageKey, function(messageKey) {
                        CacheService.hashDel(serviceType, messageKey).then(function() {
                            Connection.removeHandler(messageKey);
                        });
                    }).then(function() {
                        CacheService.hashSet(serviceType, messageToSend.messageKey, messageToSend).then(function() {
                            Service.request('service.core').post('/sendMessage').then(function() {
                                sails.log.info('Message sent from client.');
                            });
                        });
                    });
                }
            });
        });
        return 'ok';
    }
};
