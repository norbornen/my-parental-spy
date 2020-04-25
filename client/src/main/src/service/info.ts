import { EventEmitter } from 'events';
import { app, powerMonitor } from 'electron';
import log from 'electron-log';
import NetstatService, { NetworkConnectionData } from './info/netstat';
import NodeCache from 'node-cache';
import { boundMethod } from 'autobind-decorator';
import { async_timer } from 'execution-time-decorators';


type N = Pick<NetworkConnectionData, 'protocol' | 'peeraddress' | 'peerport'> & { process?: string };


export default class InfoService extends EventEmitter {
    private readonly netstatService = new NetstatService();
    private netTimeoutRef?: NodeJS.Timeout;

    constructor(private infoTimeout: number = 1.99 * 1000) {
        super();
        process.nextTick(this.init);
    }

    public async destroy() {
        if (this.netTimeoutRef) {
            clearTimeout(this.netTimeoutRef);
            this.netTimeoutRef = undefined;
        }

        powerMonitor.removeAllListeners();

        await this.netstatService.destroy();
    }

    @boundMethod
    private init() {
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
    public async netHandler(): Promise<N[]> {
        const networkConnectionsData = await this.netstatService.networkConnections();

        const { data } = networkConnectionsData.reduce((acc, x) => {
            if (x.peeraddress !== null && x.peeraddress !== undefined &&
                x.peeraddress !== x.localaddress &&
                x.peeraddress !== '*' && x.peeraddress !== '0.0.0.0'
            ) {
                const uniq_key = [x.pid, x.peeraddress, x.peerport].join('-');
                if (!(uniq_key in acc.seen)) {
                    acc.seen[uniq_key] = true;
                    acc.data.push({
                        protocol: x.protocol,
                        peeraddress: x.peeraddress,
                        peerport: x.peerport,
                        process: x.process?.name
                    });
                }
            }
            return acc;
        }, { seen: {} as {[key: string]: boolean}, data: [] as N[]});

        return data;
    }

}
