var discovery = require('../../lib/discovery.js');

module.exports = {
    register: discovery.register,

    request: discovery.request,

    mocks: {
        add: discovery.addMock
    },

    getName: discovery.getName,

};