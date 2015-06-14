/**
 * MessageService.js
 * @description :: allows local service to queue sms text and email messages into core and get feedback async
 */
var _ = require('lodash');
module.exports = {

    /**
     * sendMessage function
     * @param msg - message data
     * @returns {string}
     */
    sendMessage: function (msg) {
        var messageToSend = _.extend(new messageStruct(), msg);
        return Connection.nextGlobalCounter()
            .then(function (newKey) {
                messageToSend.messageKey = newKey;
                Connection.addHandler(newKey, function (messageKey) {
                    CacheService.hashDelete(messageToSend.serviceType, messageKey).then(function () {
                        Connection.removeHandler(messageKey);
                    });
                });
                return CacheService.hashSet(messageToSend.serviceType, messageToSend.messageKey, JSON.stringify(messageToSend));
            })
            .then(function () {
                return Service.request('service.core').post('/sendMessage', messageToSend);
            })
            .then(function (results) {
                if (results.status !== 200) {
                    throw new Error('Core Service message failure.');
                } else {
                    return JSON.parse(results.body);
                }
            });
    }
};

function messageStruct() {
    this.serviceType = '';
    this.messageKey = '';
    this.subject = '';
    this.from = '';
    this.to = '';
    this.message = '';
}