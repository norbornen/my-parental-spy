import log from 'electron-log';
const netstat = require('node-netstat');
import PsService, { ProcessDescriptor } from './pslist';
import { async_timer } from 'execution-time-decorators';


type InternalProcessDescriptor = Pick<ProcessDescriptor, 'name' | 'pid'>;

interface InternalNetworkConnectionData {
    protocol: string;
    local: { port?: string; address?: string; };
    remote: { port?: string; address?: string; };
    state: string;
    pid: number;
}

export interface NetworkConnectionData {
    protocol: string;
    localaddress?: string;
    localport?: string;
    peeraddress?: string;
    peerport?: string;
    state: string;
    pid: number;
    process?: InternalProcessDescriptor;
}


export default class NetstatService {
    private readonly pslist = new PsService();

    constructor(){}

    public async destroy() {
        await this.pslist.destroy();
    }

    @async_timer
    public async networkConnections(): Promise<NetworkConnectionData[]> {
        const netstatData = await this.netstat();

        const networkConnectionsData: NetworkConnectionData[] = [];
        for (const { protocol, local, remote, state, pid } of netstatData) {
            const x: NetworkConnectionData = { protocol, state, pid };
            if (local) {
                x.localaddress = local.address;
                x.localport = local.port;
            }
            if (remote) {
                x.peeraddress = remote.address;
                x.peerport = remote.port;
            }
            if (pid) {
                const proc = await this.processByPid(pid);
                if (proc) {
                    x.process = proc;
                }
            }
            networkConnectionsData.push(x);
        }

        return networkConnectionsData;
    }

    private netstat(): Promise<InternalNetworkConnectionData[]> {
        return new Promise((resolve, reject) => {
            let netstatData: InternalNetworkConnectionData[] = [];
            netstat({
                done: (err?: Error) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(netstatData);
                    netstatData = [];
                }
            }, (x: InternalNetworkConnectionData) => netstatData.push(x));
        });
    }

    private async processByPid(pid: number): Promise<InternalProcessDescriptor | undefined> {
        const pslistProcess = await this.pslist.processByPid(pid);
        let process: InternalProcessDescriptor | undefined;
        if (pslistProcess) {
            process = { name: pslistProcess.cmd || pslistProcess.name, pid: pslistProcess.pid };
        }
        return process;
    }

}
