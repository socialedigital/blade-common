var Prometheus = require("prometheus-client");

var metricsClient = new Prometheus();

var memoryGauge = metricsClient.newGauge({
    namespace: "memory",
    name     : "usage",
    help     : "Memory Usage"
});

var memoryGaugeInterval = setInterval(function() {
    var usage = process.memoryUsage();
    memoryGauge.set({type: 'rss'}, usage.rss);
    memoryGauge.set({type: 'heapTotal'}, usage.heapTotal);
    memoryGauge.set({type: 'heapUsed'}, usage.heapUsed);
}, 1000);

module.exports.metrics = {

    client: metricsClient,

    httpRequestCounter: metricsClient.newCounter({
        namespace: "http",
        name     : "http_requests_total",
        help     : "The number of http requests received."
    }),

    httpResponseCounter: metricsClient.newCounter({
        namespace: "http",
        name     : "http_responses_total",
        help     : "The number of http responses sent."
    }),

    httpResponseTime: metricsClient.newGuage({
        namespace: "http",
        name     : "http_response_time",
        help     : "Response Time"
    }),

    serviceCallCounter: metricsClient.newCounter({
        namespace: "blade",
        name     : "service_call_total",
        help     : "The number of Blade service calls made."
    })

};
