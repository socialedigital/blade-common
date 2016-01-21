var _ = require("lodash");

var mapFields = function(map, data){
    return _.reduce(map, function(result, mappedKey, key){
        var noData = (!data[key]);
        var mapField = mappedKey;

        //if the data is an object, and the map is an object, get the fieldname, and recurse
        if(_.isPlainObject(data[key])){
            if(_.isPlainObject(mappedKey)){
                mapField = _.get(mappedKey, "__fieldName", key);
            } //what to do if map value is string? throw error? allow nested object?
            result[mapField] = mapFields(mappedKey, data[key]);
        }
        //if the data for the key is not an object...
        else{
            //and it's not the fieldname string...
            if(key !== "__fieldName"){
                //if the corresponding mapping value IS an object
                if(_.isPlainObject(mappedKey)){
                    //and there isn't any data for that key, basically do nothing
                    if(noData){
                        mapField = _.get(mappedKey, "__fieldName", key);
                        result[mapField] = undefined; //originally was set to empty object - causes validation errors on PUT
                    }
                    //if that key is an array, go into the array and recurse for each object inside the array
                    else if(_.isArray(data[key])){
                        mapField = key;
                        result[mapField] = [];
                        for(var i in data[key]){
                            result[mapField].push(mapFields(mappedKey, data[key][i]));
                        }
                    }
                    //if the mapping value is just a string, set the corresponding data to it if it exists. this is the base case.
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