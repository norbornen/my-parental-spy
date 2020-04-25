import log from 'electron-log';
import { default as pslist } from 'ps-list';
import NodeCache from 'node-cache';
import { async_timer } from 'execution-time-decorators';


export type ProcessDescriptor = pslist.ProcessDescriptor;

export default class PsService {
    private processesCache!: NodeCache;

    constructor(stdTTL: number = 58){
        const checkperiod = Math.floor(stdTTL / 2) || 1;
        this.processesCache = new NodeCache({ stdTTL, checkperiod });
    }

    public async destroy() {
        this.processesCache?.flushAll();
        this.processesCache?.close();
    }

    public async processByPid(pid: number): Promise<pslist.ProcessDescriptor | undefined> {
        if (!this.processesCache.has(pid)) {
            await this.renewCache();
        }

        return this.processesCache.get<pslist.ProcessDescriptor>(pid);
    }

    @async_timer
    private async renewCache(): Promise<void> {
        let psArray: pslist.ProcessDescriptor[];
        try {
            psArray = await pslist();
        } catch (err) {
            log.error(err);
            return;
        }

        const psMap = psArray.reduce((acc, x) => (acc[x.pid] = x) && acc, {} as {[key: number]: pslist.ProcessDescriptor});

        const stopPid = [0, 1, 4];

        psArray.forEach((x) => {
            let proc: pslist.ProcessDescriptor = x;
            if (process.platform !== 'win32') {
                while (proc.ppid !== null && proc.ppid !== undefined
                        && stopPid.indexOf(proc.ppid) === -1 && (proc.ppid in psMap)
                ) {
                    proc = psMap[proc.ppid];
                }
            }
            this.processesCache.set<pslist.ProcessDescriptor>(x.pid, proc);
        });
    }
}
