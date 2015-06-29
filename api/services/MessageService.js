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
        var sMsg = _.extend(new MessageStructure(), msg);
        return Connection.nextGlobalCounter()
            .then(function (newKey) {
                sMsg.messageKey = newKey;
                Connection.addHandler(newKey, function (messageKey) {
                    CacheService.hashDelete(sMsg.serviceType, messageKey)
                        .then(function () {
                            Connection.removeHandler(messageKey);
                        });
                });
                return CacheService.hashSet(sMsg.serviceType, sMsg.messageKey, JSON.stringify(sMsg));
            })
            .then(function () {
                return Service.request('service.core').post('/sendMessage', sMsg);
            })
            .then(function (results) {
                return results;
            });
    }
};

function MessageStructure() {
    this.serviceType = '';
    this.messageKey = '';
    this.subject = '';
    this.from = '';
    this.to = '';
    this.message = '';
}