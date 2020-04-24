import { EventEmitter } from 'events';
import { app, powerMonitor } from 'electron';
import log from 'electron-log';
import * as si from 'systeminformation';
import NodeCache from 'node-cache';
import { boundMethod } from 'autobind-decorator';
import { async_timer } from 'execution-time-decorators';

interface ProcessesProcessDataExtend extends si.Systeminformation.ProcessesProcessData {
    parents: si.Systeminformation.ProcessesProcessData[];
}

interface ConnectionInfo {
    protocol: any;
    peeraddress: any;
    peerport: any;
    process?: any;
    _process?: any;
}

export default class InfoService extends EventEmitter {
    private processesCache?: NodeCache;
    private netTimeoutRef?: NodeJS.Timeout;

    constructor(private infoTimeout: number = 1.99 * 1000) {
        super();
        process.nextTick(this.init);
    }

    public async destroy() {
        this.processesCache?.flushAll();

        if (this.netTimeoutRef) {
            clearTimeout(this.netTimeoutRef);
            this.netTimeoutRef = undefined;
        }

        powerMonitor.removeAllListeners();
    }

    @boundMethod
    private init() {
        const stdTTL = Math.ceil((2 * this.infoTimeout) / 1000) + 1; // не правильно, тут должно быть больше на порядок
        const checkperiod = Math.ceil(this.infoTimeout / 1000) + 1;
        log.info(this.infoTimeout, stdTTL, checkperiod)
        this.processesCache = new NodeCache({ stdTTL, checkperiod });

        if (app.isReady()) {
            this.powerMonitor();
        } else {
            app.once('ready', this.powerMonitor);
        }

        this.netMonitor();
    }

    @boundMethod
    private powerMonitor() {
        powerMonitor.on('suspend', () => this.emit('power', 'suspend'));
        powerMonitor.on('resume', () => this.emit('power', 'resume'));
        powerMonitor.on('shutdown', () => this.emit('power', 'shutdown'));
    }

    @boundMethod
    private netMonitor() {
        this.netTimeoutRef = setTimeout(async () => {
            process.nextTick(this.netMonitor);

            try {
                const data = await this.netHandler();
                if (data && data.length > 0) {
                    this.emit('net', data);
                }
            } catch (err) {
                log.error(err);
            }
        }, this.infoTimeout);
    }

    @async_timer
    public async netHandler(): Promise<any[]> {
        const ndata = await this.getNetworkConnections();
        const infoData = [];
        const seen: {[key: string]: boolean} = {}; // for uniq by pid and peer

        for (const conn of ndata) {
            try {
                const x: ConnectionInfo = {
                    protocol: conn.protocol,
                    peeraddress: conn.peeraddress,
                    peerport: conn.peerport,
                };
                if ('process' in conn && conn.process !== undefined && conn.process !== null && conn.process !== '') {
                    x._process = conn.process;
                }

                const proc = await this.getProcessByPid(conn.pid);
                if (!proc) {
                    infoData.push(x);
                } else {
                    const x_process = process.platform === 'win32' || proc.parents?.length === 0 ? proc
                                        : proc.parents[proc.parents.length - 1];
                    x.process = { name: x_process.name, command: x_process.command };

                    const uniq_key = [x_process.pid, conn.peeraddress, conn.peerport].join('-');
                    if (!(uniq_key in seen)) {
                        seen[uniq_key] = true;
                        infoData.push(x);
                    }
                }
            } catch (err) {
                log.warn(err);
            }
        }

        return infoData;
    }

    private async getNetworkConnections(): Promise<si.Systeminformation.NetworkConnectionsData[]> {
        const ndata = await si.networkConnections();
        const re = /\.\d+$/;
        return ndata.filter((x) => x.peeraddress !== x.localaddress
            && x.peeraddress !== '*'
            && x.peeraddress !== '0.0.0.0'
            && x.localaddress.replace(re, '') !== x.peeraddress.replace(re, '')
        );
    }

    private async getProcessByPid(pid: number): Promise<ProcessesProcessDataExtend | undefined> {
        if (!this.processesCache!.has(pid)) {
            await this.renewProcessesCache();
        }

        return this.processesCache!.get(pid);
    }

    private async renewProcessesCache() {
        this.processesCache!.flushAll();

        const { list: processes } = await si.processes();
        const processesMap = processes.reduce((acc, x) => acc.set(x.pid, x), new Map<number, si.Systeminformation.ProcessesProcessData>());
        const extendProcesses = processes.reduce((acc, x) => {
            const parents: si.Systeminformation.ProcessesProcessData[] = [];
            let parentPid: number | undefined = x.parentPid;
            while (parentPid !== undefined && parentPid !== null && [0, 1, 4].indexOf(parentPid) === -1) {
                const p = processesMap.get(parentPid);
                parentPid = p?.parentPid !== parentPid ? p?.parentPid : undefined;
                if (p) {
                    parents.push(p);
                }
            }
            acc.push({ ...x, parents })
            return acc;
        }, [] as ProcessesProcessDataExtend[]);

        this.processesCache!.mset(
            extendProcesses.map((x) => ({key: x.pid, val: x}))
        );
    }

}
