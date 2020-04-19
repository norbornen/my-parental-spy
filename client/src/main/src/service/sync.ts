import log from 'electron-log';
import { net } from 'electron';
import { pipeline, Readable, Writable } from 'stream';
import { promisify } from 'util';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import createHttpError, * as HttpErrors from 'http-errors';
import pRetry from 'p-retry';
import { boundMethod } from 'autobind-decorator';
import * as asyncJSON from '../util/async-json';
import { async_timer } from 'execution-time-decorators';

const gzipPromisify = promisify<zlib.InputType, Buffer>(zlib.gzip);

export default class SyncService {
    constructor(
        private readonly uid: string,
        private readonly endpoint: string
    ) {}

    public async destroy() {
        //
    }

    @async_timer
    public async syncOnce<T extends any>(data: any): Promise<T> {
        const json = await asyncJSON.stringify(data);
        const [ jsonGzip, sign ] = await Promise.all([ gzipPromisify(json), this.sign(json) ]);
        return this.sync_req(jsonGzip, sign);
    }

    @async_timer
    public async sync<T extends any>(data: any): Promise<T> {
        const json = await asyncJSON.stringify(data);
        const [ jsonGzip, sign ] = await Promise.all([ gzipPromisify(json), this.sign(json) ]);
        return pRetry<T>(
            () => this.sync_req(jsonGzip, sign),
            {
                onFailedAttempt: (err) => {
                    if (err instanceof HttpErrors.HttpError && (err.statusCode === 406 || err.statusCode === 500)) {
                        throw err;
                    }
                    log.info(`[SyncService::sync]   ${err.name}, attemptNumber: ${err.attemptNumber}, retriesLeft=${err.retriesLeft}`);
                    log.warn(err);
                },
                retries: 10,
                factor: 3,
            }
        );
    }

    private async sync_req(formData: Buffer, sign?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const syncUrl = `${this.endpoint}/sync?sign=${sign}`.replace(/(?<!:)\/{2,}/g, '/');
            const request = net.request({
                url: syncUrl,
                method: 'POST'
            });
            request.setHeader('Content-Type', 'text/plain');
            request.setHeader('X-UID', this.uid);
            request
                .on('error', reject)
                .on('response', (response) => {
                    const responseDataBuf: Buffer[] = [];
                    response
                        .on('error', reject)
                        .on('data', (chunk) => responseDataBuf.push(chunk))
                        .on('end', () => {
                            const responseData = Buffer.concat(responseDataBuf).toString();

                            if ([0, 200, 201, 204].indexOf(response.statusCode) > -1) {
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

            request.chunkedEncoding = true;
            request.write(formData.toString('base64'));
            request.end();
        });
    }

    @boundMethod
    private async sign(data: string): Promise<string> {
        const key = Array.from(this.uid).sort((a, b) => a.localeCompare(b)).join('');
        return crypto.createHmac('md5', key).update(data).digest('hex');
    }
}
