const yj = require('yieldable-json');
import { promisify } from 'util';

const ytStringifyAsyncPromisify = promisify(yj.stringifyAsync);
const ytParseAsyncPromisify = promisify(yj.parseAsync);

export function stringify(...args: any[]): Promise<string> {
    return ytStringifyAsyncPromisify(...args);
}

export function parse<T extends any>(...args: any[]): Promise<T> {
    return ytParseAsyncPromisify(...args);
}
