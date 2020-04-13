import log from 'electron-log';
import * as si from 'systeminformation';
import NodeCache from 'node-cache';
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

export default class InfoService {
    private processesCache = new NodeCache({ stdTTL: 53, checkperiod: 10 });

    constructor() {}

    public async destroy() {
        this.processesCache.flushAll();
    }

    // @async_timer
    public async slice(): Promise<any[]> {
        const infoData = [];

        const ndata = await this.getNetworkConnections();
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
                infoData.push(x);

                const proc = await this.getProcessByPid(conn.pid);
                if (proc) {
                    x.process = { name: proc.name, command: proc.command, started: proc.started };
                    if (proc.parents && proc.parents.length > 0) {
                        x.process.parents = proc.parents.map(({ name, started, command }) => ({ name, started, command }));
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
        return ndata.filter((x) => x.peeraddress !== x.localaddress && x.peeraddress !== '*');
    }

    private async getProcessByPid(pid: number): Promise<ProcessesProcessDataExtend | undefined> {
        if (!this.processesCache.has(pid)) {
            await this.renewProcessesCache();
        }

        return this.processesCache.get(pid);
    }

    private async renewProcessesCache() {
        this.processesCache.flushAll();

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

        this.processesCache.mset(
            extendProcesses.map((x) => ({key: x.pid, val: x}))
        );
    }

}
