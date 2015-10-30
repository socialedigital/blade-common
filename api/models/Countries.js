
module.exports = {
    autoPK: false,
    attributes: {
        alpha_3: {
            type: 'string',
            size: 3,
            unique: true,
            primaryKey: true,
            columnName: 'code'
        },
        country_code: {
            type: 'string',
            size: 3
        },
        name: { type: 'string' },
        alpha_2: { type: 'string', size: 2 },
        iso_3166_2: { type: 'string' },
        region: { type: 'string' },
        sub_region: { type: 'string' },
        region_code: { type: 'string' },
        sub_region_code: {type: 'string' },
        country_dialing_code: {type: 'string'}
    },
    seedData: __dirname + '/../../lib/data/countries.json'
};
