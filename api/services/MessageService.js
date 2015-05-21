/**
 * MessageService.js
 * @description :: allows local service to queue sms text and email messages into core and get feedback async
 * @type {{sendText: Function, sendEmail: Function}}
 */
module.exports = {

    sendText: function() {
        // wrapper to call core-service endpoint for fulfillment -
        //  - log into pending list awaiting confirmation
        //  - setup listener for confirmation
        //  - call endpoint to queue message
        return 'ok';
    },

    sendEmail: function() {
        // wrapper to call core-service endpoint for fulfullment -
        //  - log into pending email list awaiting confirmation
        //  - setup listener for confirmation
        //  - call endpoint to queue message
        return 'ok';
    }

};
