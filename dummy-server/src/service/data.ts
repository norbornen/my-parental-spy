
import * as zlib from 'zlib';
import * as util from 'util';
import * as dns from 'dns';
import pSettle from 'p-settle';
import { boundMethod } from 'autobind-decorator';
import { async_timer } from 'execution-time-decorators';
import * as portNumbers from 'port-numbers';
import * as yj from 'yieldable-json';

const gunzipAsync = util.promisify<Buffer, Buffer>(zlib.gunzip);
const jsonParseAsync = util.promisify<string, any>(yj.parseAsync);
// const dnsReverseAsync = util.promisify<string, string[]>(dns.reverse);

const r = new dns.Resolver();
r.setServers([
    // '195.34.31.50',
    // '62.112.106.130',

    '1.1.1.1',
    '1.0.0.1',
    '2606:4700:4700::1111',
    '2606:4700:4700::1001'
    // '4.4.4.4',
    // '[2001:4860:4860::8888]',
    // '8.8.8.8',
    // '8.8.4.4',
    // '2001:4860:4860::8888',
    // '2001:4860:4860::8844'
]);
const dnsReverseAsync = util.promisify<string, string[]>(r.reverse.bind(r));
console.log(r.getServers());


interface SyncInputDTO {
    type: 'power' | 'net';
    date: string | Date;
    payload: {[key: string]: any};
}

interface SyncDTO {
    type: SyncInputDTO['type'];
    date: Date;
    uid: string;
}

interface NetDTO extends SyncDTO {
    type: 'net';
    peeraddress: string;
    peerport?: string;
    peerhostnames?: string[];
    protocol?: string;
    service?: string;
    process?: string;
}

interface PowerDTO extends SyncDTO {
    type: 'power';
    action: string;
}


export default class DataHandleService {

    constructor(private readonly uid: string){}

    @boundMethod
    public async serverSyncData(zipData: string, _sign?: string) {
        const rawData = await this.unpackSyncData(zipData);
        if (!Array.isArray(rawData)) {
            console.error('SYNC_DATA_IS_NOT_ARRAY', rawData);
            return;
        }

        try {
            console.log('...');
            r.reverse('212.188.35.78', (err, x) => {
                console.log('a', err, x);
            });
        } catch (err) {
            console.error(err);
        }

        // const items = await this.processSyncData(rawData as any[]);
        // console.log(items);
    }

    @boundMethod
    private async processSyncData(rawItems: SyncInputDTO[]): Promise<(NetDTO | PowerDTO)[]> {
        const items = (await pSettle<NetDTO | PowerDTO | undefined>(
            rawItems.map((x) => {
                let p: Promise<NetDTO | PowerDTO | undefined>;
                switch (x.type) {
                    case 'power': p = this.processSyncPowerData(x); break;
                    case 'net': p = this.processSyncNetData(x); break;
                    default:
                        console.warn('UNKNOWN_TYPE_OF_DATA', x);
                        p = Promise.reject('UNKNOWN_TYPE_OF_DATA');
                }
                return p;
            })
        )).reduce((acc, item) => {
            if (item.isFulfilled && item.value) {
                acc.push(item.value);
            }
            if (item.isRejected) {
                console.warn(item.reason);
            }
            return acc;
        }, [] as (NetDTO | PowerDTO)[]);

        return items;
    }

    private async processSyncPowerData(x: SyncInputDTO): Promise<PowerDTO | undefined> {
        if (!x.date || !x.payload || !x.payload.type) {
            return undefined;
        }
        const item: PowerDTO = {
            uid: this.uid, type: 'power', date: new Date(x.date),
            action: x.payload.type.toLocaleUpperCase()
        };
        return item;
    }

    private async processSyncNetData(x: SyncInputDTO): Promise<NetDTO | undefined> {
        if (!x.date || !x.payload || !x.payload.peeraddress) {
            return undefined;
        }

        const item: NetDTO = {
            uid: this.uid, type: 'net', date: new Date(x.date),
            peeraddress: x.payload.peeraddress, peerport: x.payload.peerport,
            protocol: x.payload.protocol, process: x.payload.protocol
        };
        const service = portNumbers.getService(x.payload.peerport);
        if (service) {
            item.service = service.name;
        }
        try {
            const hostnames = await dnsReverseAsync(x.payload.peeraddress);
            if (hostnames && hostnames.length > 0) {
                item.peerhostnames = hostnames;
            }
        } catch(err) {
            // if ((err.errno || err.code) !== 'ENOTFOUND') {
                console.warn(err);
            // }
        }

        return item;
    }

    private async unpackSyncData(data: string): Promise<any> {
        let res: any;
        try {
            const buf = Buffer.from(data, 'base64');
            data = (await gunzipAsync(buf)).toString();
        } catch (err) {
            console.error(err);
        }
        try {
            res = await jsonParseAsync(data);
        } catch (err) {
            console.error(err);
        }
        return res;
    }

}
