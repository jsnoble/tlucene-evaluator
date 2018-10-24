'use strict';

const StringType = require('./types/string');
const DateType = require('./types/dates');

class TypeManager {
    constructor(typeConfig) {
        const typeList = [];

        const config = this._buildFieldListConfig(typeConfig)
        
        if (config.date ) {
            typeList.push(new DateType(config.date))
        }
            // if (typeConfig[key] === 'geo' ) {
            //     hasGeoTypes = true;
            // }
            // if (typeConfig[key] === 'regex' ) {
            //     regexField = key;
            // }
      //  }
        

        // by default we parse everything by strings so it needs to be included
        typeList.push(new StringType())
        this.typeList = typeList;
    }

    _buildFieldListConfig(typeConfig) {
        const results = {};
        for (const key in typeConfig) {
            if (typeConfig[key] === 'date' ) {
                if (!results.date) results.date = {};
                results.date[key] = true;
            }
            // if (typeConfig[key] === 'geo' ) {
            //     hasGeoTypes = true;
            // }
            // if (typeConfig[key] === 'regex' ) {
            //     regexField = key;
            // }
        }
        return results;
    }

    processAst(ast) {
        return this.typeList.reduce((ast, type) => {
            return type.processAst(ast)
        }, ast)
    }

    formatData(doc) {
        return this.typeList.reduce((doc, type) => {
            return type.formatData(doc)
        }, doc)
    }
}

module.exports = TypeManager;