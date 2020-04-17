const yj = require('yieldable-json');
import * as zlib from 'zlib';
import { promisify } from 'util';

const ytStringifyAsyncPromisify = promisify(yj.stringifyAsync);
const ytParseAsyncPromisify = promisify(yj.parseAsync);
const gzipPromisify = promisify<zlib.InputType, Buffer>(zlib.gzip);

export function stringify(...args: any[]): Promise<string> {
    return ytStringifyAsyncPromisify(...args);
}

export function parse<T extends any>(...args: any[]): Promise<T> {
    return ytParseAsyncPromisify(...args);
}

export function gzip(...args: any[]): Promise<Buffer> {
    return stringify(...args).then(gzipPromisify);
}
