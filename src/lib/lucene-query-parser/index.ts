
const parser  = require('../../../peg/peg_engine');
import { ast } from '../utils';

export interface cb {
    (node: ast, _field: string, depth: number): void
}

export default class LuceneQueryParser {
    _ast: ast;
    constructor() {
        this._ast = {};
    }
    public parse(luceneStr: string): void {
        try {
            this._ast = parser.parse(luceneStr);
        } catch (err) {
            throw new Error(`error occured while attempting to parse lucene query: ${luceneStr} , error: ${err.message}`);
        }
    }

    public walkLuceneAst(preCb: cb, postCb?: cb, _argAst?: ast): any {
        const { _ast } = this;
        const ast = _argAst || _ast;

        function walk(node: ast, _field: string, depth: number): void {
            const topField = (node.field && node.field !== "<implicit>") ? node.field : _field;

            if (node.left) {
                walk(node.left, topField, depth + 1);
            }

            preCb(node, topField, depth);

            if (node.right) {
                walk(node.right, topField, depth + 1);
            }
            if (postCb) postCb(node, topField, depth);
        }

        return walk(ast, '', 0);
    }
}
