var _ = require("lodash");

var mapFields = function(map, data){
    return _.reduce(map, function(result, mappedKey, key){
        var noData = (!data[key]);
        var mapField = mappedKey;
        if(_.isPlainObject(data[key])){
            if(_.isPlainObject(mappedKey)){
                mapField = _.get(mappedKey, "__fieldName", key);
            } //what to do if map value is string? throw error? allow nested object?
            result[mapField] = mapFields(mappedKey, data[key]);
        }
        else{
            if(key !== "__fieldName"){
                if(_.isPlainObject(mappedKey)){
                    if(noData){
                        mapField = _.get(mappedKey, "__fieldName", key);
                        result[mapField] = undefined; //originally was set to empty object - causes validation errors on PUT
                    }
                    else if(_.isArray(data[key])){
                        mapField = key;
                        result[mapField] = [];
                        for(var i in data[key]){
                            result[mapField].push(mapFields(mappedKey, data[key][i]));
                        }
                    }
                } else {
                    if(noData){
                        result[mapField] = undefined;
                    } else {
                        result[mapField] = data[key];
                    }
                }
            }
        }
        return result;
    }, {})
}

module.exports = mapFields;