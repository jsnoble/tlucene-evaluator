'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const lucene_query_parser_1 = __importDefault(require("../lucene-query-parser"));
const type_manager_1 = __importDefault(require("./type-manager"));
const utils_1 = require("../utils");
class DocumentMatcher extends lucene_query_parser_1.default {
    // TODO: chang the any on typeConfig
    constructor(luceneStr, typeConfig) {
        super();
        this.types = new type_manager_1.default(typeConfig);
        utils_1.bindThis(this, DocumentMatcher);
        if (luceneStr) {
            this.parse(luceneStr);
            this._buildFilterFn();
        }
    }
    parse(luceneStr, typeConfig) {
        if (typeConfig) {
            this.types = new type_manager_1.default(typeConfig);
        }
        super.parse(luceneStr);
        this._buildFilterFn();
    }
    _buildFilterFn() {
        const { _ast: ast, types, _parseRange: parseRange } = this;
        let fnStrBody = '';
        let addParens = false;
        const parensDepth = {};
        const parsedAst = types.processAst(ast);
        console.log('the whole ast', JSON.stringify(ast, null, 4));
        function strBuilder(ast, field, depth) {
            if (field && ast.term) {
                if (field === '_exists_') {
                    fnStrBody += `data.${ast.term} != null`;
                }
                else if (field === '__parsed') {
                    fnStrBody += `${ast.term}`;
                }
                else {
                    fnStrBody += `data.${field} == "${ast.term}"`;
                }
            }
            if (ast.term_min) {
                fnStrBody += parseRange(ast, field);
            }
            if (ast.operator) {
                let opStr = ' || ';
                if (ast.operator === 'AND') {
                    opStr = ' && ';
                    // only add a () around deeply recursive structures
                    if ((ast.right && (ast.right.left || ast.right.right)) || (ast.left && (ast.left.left || ast.left.right))) {
                        addParens = true;
                        opStr = ' && (';
                        parensDepth[depth] = true;
                    }
                }
                fnStrBody += opStr;
            }
        }
        function postParens(_ast, _field, depth) {
            if (addParens && parensDepth[depth]) {
                addParens = false;
                fnStrBody += ')';
            }
        }
        this.walkLuceneAst(strBuilder, postParens, parsedAst);
        const argsObj = types.injectTypeFilterFns();
        const argsFns = [];
        const strFnArgs = [];
        lodash_1.default.forOwn(argsObj, (value, key) => {
            strFnArgs.push(key);
            argsFns.push(value);
        });
        strFnArgs.push('data', `return ${fnStrBody}`);
        console.log('what is the body', strFnArgs);
        try {
            const strFilterFunction = new Function(...strFnArgs);
            this.filterFn = (data) => strFilterFunction(...argsFns, data);
        }
        catch (err) {
            throw new Error(`error while attempting to build filter function \n\n new function components: ${strFnArgs} \n\nerror: ${err.message}`);
        }
    }
    _parseRange(node, topFieldName) {
        let { inclusive_min: incMin, inclusive_max: incMax, term_min: minValue, term_max: maxValue, field = topFieldName } = node;
        if (minValue === '*')
            minValue = -Infinity;
        if (maxValue === '*')
            maxValue = Infinity;
        // IPs can use range syntax, if no type is set it needs to return
        // a hard coded string interpolated value
        [minValue, maxValue] = [minValue, maxValue].map((data) => {
            if (typeof data === 'string')
                return `"${data}"`;
            return data;
        });
        // ie age:>10 || age:(>10 AND <=20)
        if (!incMin && incMax) {
            if (maxValue === Infinity) {
                return `data.${field} > ${minValue}`;
            }
            return `((${maxValue} >= data.${field}) && (data.${field}> ${minValue}))`;
        }
        // ie age:<10 || age:(<=10 AND >20)
        if (incMin && !incMax) {
            if (minValue === -Infinity) {
                return `data.${field} < ${maxValue}`;
            }
            return `((${minValue} <= data.${field}) && (data.${field} < ${maxValue}))`;
        }
        // ie age:<=10, age:>=10, age:(>=10 AND <=20)
        if (incMin && incMax) {
            if (maxValue === Infinity) {
                return `data.${field} >= ${minValue}`;
            }
            if (minValue === -Infinity) {
                return `data.${field} <= ${maxValue}`;
            }
            return `((${maxValue} >= data.${field}) && (data.${field} >= ${minValue}))`;
        }
        // ie age:(>10 AND <20)
        if (!incMin && !incMax) {
            return `((${maxValue} > data.${field}) && (data.${field} > ${minValue}))`;
        }
        return '';
    }
    match(doc) {
        const { types } = this;
        if (!this.filterFn)
            throw new Error('DocumentMatcher must be initialized with a lucene query');
        const data = types.formatData(doc);
        return this.filterFn(data);
    }
}
exports.default = DocumentMatcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGliL2RvY3VtZW50LW1hdGNoZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDOzs7OztBQUViLG9EQUF1QjtBQUN2QixpRkFBdUQ7QUFDdkQsa0VBQXdDO0FBQ3hDLG9DQUF5QztBQUV6QyxNQUFxQixlQUFnQixTQUFRLDZCQUFpQjtJQUkxRCxvQ0FBb0M7SUFDcEMsWUFBWSxTQUFrQixFQUFFLFVBQWU7UUFDM0MsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksc0JBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN4QyxnQkFBUSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztRQUVoQyxJQUFJLFNBQVMsRUFBRTtZQUNYLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1NBQ3pCO0lBQ0wsQ0FBQztJQUVNLEtBQUssQ0FBQyxTQUFpQixFQUFFLFVBQWdCO1FBQzVDLElBQUksVUFBVSxFQUFFO1lBQ1osSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLHNCQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDM0M7UUFDRCxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8sY0FBYztRQUNsQixNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUMzRCxJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDbkIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUV2QixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTFELFNBQVMsVUFBVSxDQUFDLEdBQU8sRUFBRSxLQUFZLEVBQUUsS0FBWTtZQUNuRCxJQUFJLEtBQUssSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFO2dCQUNuQixJQUFJLEtBQUssS0FBSyxVQUFVLEVBQUU7b0JBQ3RCLFNBQVMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQztpQkFDM0M7cUJBQU0sSUFBSSxLQUFLLEtBQUssVUFBVSxFQUFFO29CQUM3QixTQUFTLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7aUJBQzlCO3FCQUFNO29CQUNILFNBQVMsSUFBSSxRQUFRLEtBQUssUUFBUSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUM7aUJBQ2pEO2FBQ0o7WUFDRCxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUU7Z0JBQ2QsU0FBUyxJQUFJLFVBQVUsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDdkM7WUFFRCxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUU7Z0JBQ2QsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDO2dCQUVuQixJQUFJLEdBQUcsQ0FBQyxRQUFRLEtBQUssS0FBSyxFQUFFO29CQUN4QixLQUFLLEdBQUcsTUFBTSxDQUFDO29CQUNmLG1EQUFtRDtvQkFDbkQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO3dCQUN2RyxTQUFTLEdBQUcsSUFBSSxDQUFDO3dCQUNqQixLQUFLLEdBQUcsT0FBTyxDQUFDO3dCQUNoQixXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDO3FCQUM3QjtpQkFDSjtnQkFDRCxTQUFTLElBQUksS0FBSyxDQUFDO2FBQ3RCO1FBQ0wsQ0FBQztRQUVELFNBQVMsVUFBVSxDQUFDLElBQVEsRUFBRSxNQUFhLEVBQUUsS0FBWTtZQUNyRCxJQUFJLFNBQVMsSUFBSSxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUU7Z0JBQ2pDLFNBQVMsR0FBRyxLQUFLLENBQUM7Z0JBQ2xCLFNBQVMsSUFBSSxHQUFHLENBQUM7YUFDcEI7UUFDTCxDQUFDO1FBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXRELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzVDLE1BQU0sT0FBTyxHQUFlLEVBQUUsQ0FBQztRQUMvQixNQUFNLFNBQVMsR0FBWSxFQUFFLENBQUM7UUFFOUIsZ0JBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzdCLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztRQUVILFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsU0FBUyxFQUFFLENBQUMsQ0FBQztRQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFDLElBQUk7WUFDQSxNQUFNLGlCQUFpQixHQUFHLElBQUksUUFBUSxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUM7WUFDckQsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQVcsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsR0FBRyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDeEU7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsaUZBQWlGLFNBQVMsZUFBZSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztTQUMzSTtJQUNMLENBQUM7SUFFTyxXQUFXLENBQUMsSUFBUSxFQUFFLFlBQW1CO1FBQzdDLElBQUksRUFDQSxhQUFhLEVBQUUsTUFBTSxFQUNyQixhQUFhLEVBQUUsTUFBTSxFQUNyQixRQUFRLEVBQUUsUUFBUSxFQUNsQixRQUFRLEVBQUUsUUFBUSxFQUNsQixLQUFLLEdBQUcsWUFBWSxFQUN2QixHQUFHLElBQUksQ0FBQztRQUVULElBQUksUUFBUSxLQUFLLEdBQUc7WUFBRSxRQUFRLEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDM0MsSUFBSSxRQUFRLEtBQUssR0FBRztZQUFFLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFFMUMsaUVBQWlFO1FBQ2pFLHlDQUF5QztRQUN6QyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNyRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVE7Z0JBQUUsT0FBTyxJQUFJLElBQUksR0FBRyxDQUFDO1lBQ2pELE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxDQUFDO1FBRUgsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxFQUFFO1lBQ25CLElBQUksUUFBUSxLQUFLLFFBQVEsRUFBRTtnQkFDdkIsT0FBTyxRQUFRLEtBQUssTUFBTSxRQUFRLEVBQUUsQ0FBQzthQUN4QztZQUNELE9BQVEsS0FBSyxRQUFRLFlBQVksS0FBSyxjQUFjLEtBQUssS0FBSyxRQUFRLElBQUksQ0FBQztTQUM5RTtRQUNELG1DQUFtQztRQUNuQyxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNuQixJQUFJLFFBQVEsS0FBSyxDQUFDLFFBQVEsRUFBRTtnQkFDeEIsT0FBTyxRQUFRLEtBQUssTUFBTSxRQUFRLEVBQUUsQ0FBQzthQUN4QztZQUNELE9BQVEsS0FBSyxRQUFRLFlBQVksS0FBSyxjQUFjLEtBQUssTUFBTSxRQUFRLElBQUksQ0FBQztTQUMvRTtRQUVELDZDQUE2QztRQUM3QyxJQUFJLE1BQU0sSUFBSSxNQUFNLEVBQUU7WUFDbEIsSUFBSSxRQUFRLEtBQUssUUFBUSxFQUFFO2dCQUN2QixPQUFPLFFBQVEsS0FBSyxPQUFPLFFBQVEsRUFBRSxDQUFDO2FBQ3pDO1lBQ0QsSUFBSSxRQUFRLEtBQUssQ0FBQyxRQUFRLEVBQUU7Z0JBQ3hCLE9BQU8sUUFBUSxLQUFLLE9BQU8sUUFBUSxFQUFFLENBQUM7YUFDekM7WUFDRCxPQUFRLEtBQUssUUFBUSxZQUFZLEtBQUssY0FBYyxLQUFLLE9BQU8sUUFBUSxJQUFJLENBQUM7U0FDaEY7UUFFRCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNwQixPQUFRLEtBQUssUUFBUSxXQUFXLEtBQUssY0FBYyxLQUFLLE1BQU0sUUFBUSxJQUFJLENBQUM7U0FDOUU7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFTSxLQUFLLENBQUMsR0FBVTtRQUNuQixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUTtZQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQztRQUMvRixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDO0NBQ0o7QUFySkQsa0NBcUpDIn0=