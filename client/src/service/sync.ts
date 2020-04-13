import log from 'electron-log';
import { net, ClientRequest } from 'electron';
import { pipeline, Readable, Writable } from 'stream';
import { createGzip } from 'zlib';
import { promisify } from 'util';
import * as crypto from 'crypto';
import createHttpError, * as HttpErrors from 'http-errors';
import pRetry from 'p-retry';
import * as asyncJSON from './async-json';
import { async_timer } from 'execution-time-decorators';

const pipe = promisify(pipeline);


/**
 * TODO
 *  conf env
 */

export default class SyncService {

    constructor(
        private uid: string = 'e0de65e7-fd8f-4fcb-b7d9-e46ecb316fa8',
        private endpoint: string = 'http://localhost:16010/api/v1//'
    ) {}

    public async destroy() {
        //
    }

    @async_timer
    public async syncOnce<T extends any>(data: any): Promise<T> {
        return asyncJSON.stringify(data).then((formData): Promise<T> => this.sync_req(formData));
    }

    @async_timer
    public async sync<T extends any>(data: any): Promise<T> {
        return asyncJSON.stringify(data).then((formData): Promise<T> => {
            return pRetry(() => this.sync_req(formData), {
                onFailedAttempt: (err) => {
                    if (err instanceof HttpErrors.HttpError && (err.statusCode === 406 || err.statusCode === 500)) {
                        throw err;
                    }
                    log.info(`[SyncService::sync]   ${err.name}, attemptNumber: ${err.attemptNumber}, retriesLeft=${err.retriesLeft}`);
                },
                retries: 10,
                factor: 3,
            });
        });
    }

    private async sync_req(formData: string): Promise<any> {
        return new Promise(async (resolve, reject) => {
            const sign = this.sign(formData);
            const syncUrl = `${this.endpoint}/sync?sign=${sign}`.replace(/(?<!:)\/{2,}/g, '/');
            const request = net.request({
                url: syncUrl,
                method: 'POST'
            });
            request.chunkedEncoding = true;
            request.setHeader('Content-Type', 'text/plain');
            request.setHeader('Content-Encoding', 'gzip');
            request
                .on('error', reject)
                .on('response', (response) => {
                    const responseDataBuf: Buffer[] = [];
                    response
                        .on('error', reject)
                        .on('data', (chunk) => responseDataBuf.push(chunk))
                        .on('end', () => {
                            const responseData = Buffer.concat(responseDataBuf).toString();

                            if ([0, 200, 204].indexOf(response.statusCode) > -1) {
                                const contentTypeHeaders = Array.isArray(response.headers['content-type']) ? response.headers['content-type']
                                        : response.headers['content-type'] ? [response.headers['content-type']] : [];
                                const isJson = contentTypeHeaders.some((x) => x.indexOf('application/json') > -1);
                                if (isJson && responseData !== null && responseData !== undefined && /\S/.test(responseData)) {
                                    try {
                                        resolve(JSON.parse(responseData));
                                    } catch (err) {
                                        log.warn('responseData=', responseData);
                                        log.warn(err);
                                        resolve(responseData as any);
                                    }
                                } else {
                                    resolve(responseData as any);
                                }
                            } else {
                                const err = createHttpError(response.statusCode, responseData);
                                reject(err);
                            }
                        });
                });

            // Readable.from(formData).pipe(createGzip()).pipe(request as unknown as Writable);
            try {
                const source = Readable.from(formData);
                const gzip = createGzip();
                await pipe(source, gzip, request as unknown as Writable);
            } catch (err) {
                reject(err);
            }
        });
    }

    private sign(data: string): string {
        const key = Array.from(this.uid).sort((a, b) => a.localeCompare(b)).join('');
        return crypto.createHmac('md5', key).update(data).digest('hex');
    }
}
