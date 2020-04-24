import log from 'electron-log';
import SyncService from './sync';
import InfoService from './info';
import { boundMethod } from 'autobind-decorator';


type EventType = 'power' | 'net';
type EventCollectionItem = { type: EventType; date: Date; payload?: string };
type PowerEventType = 'start' | 'stop' | 'suspend' | 'resume' | 'shutdown';


export default class WatchdogService {
    private eventCollection: EventCollectionItem[] = [];

    private infoService?: InfoService;
    private infoTimeout?: number;
    private syncService?: SyncService;
    private syncTimeout = 2 * 60 * 1000;
    private syncTimeoutRef?: NodeJS.Timeout;

    constructor(
        private readonly uid: string,
        private readonly endpoint: string,
        infoTimeout?: number,
        syncTimeout?: number
    ) {
        if (!!infoTimeout) {
            this.infoTimeout = +infoTimeout;
        }
        if (!!syncTimeout) {
            this.syncTimeout = +syncTimeout;
        }

        process.nextTick(this.init);
    }

    public async destroy() {
        try {
            this.infoService?.removeAllListeners();
            await this.infoService?.destroy();
            this.infoService = undefined;
        } catch (err) {
            log.error(err);
        }

        if (this.syncTimeoutRef) {
            clearTimeout(this.syncTimeoutRef);
            this.syncTimeoutRef = undefined;
        }


        this.powerEventRegister('stop');
        await this.releaseOnce(this.eventCollection);

        try {
            await this.syncService?.destroy();
            this.syncService = undefined;
        } catch (err) {
            log.error(err);
        }
    }

    @boundMethod
    private init() {
        this.powerEventRegister('start');

        //
        this.infoService = new InfoService(this.infoTimeout);
        this.infoService
            .on('net', (d) => {
                (Array.isArray(d) ? d : [d]).forEach((x) => this.eventRegister('net', x));
            })
            .on('power', (d) => {
                (Array.isArray(d) ? d : [d]).forEach((x) => this.powerEventRegister(x));
            });

        //
        this.syncService = new SyncService(this.uid, this.endpoint);
        this.releaseMonitor();
    }

    private eventRegister(type: EventType, payload?: any) {
        const event_data: EventCollectionItem = { type, date: new Date() };
        if (payload !== null && payload !== undefined) {
            event_data.payload = payload;
        }
        this.eventCollection.push(event_data);
    }

    private powerEventRegister(type: PowerEventType) {
        this.eventRegister('power', { type });
    }

    @boundMethod
    private releaseMonitor() {
        this.syncTimeoutRef = setTimeout(async () => {
            process.nextTick(this.releaseMonitor);

            const eventCollection = this.eventCollection;
            this.eventCollection = [];
            if (eventCollection && eventCollection.length > 0) {
                await this.release(eventCollection);
            }
        }, this.syncTimeout);
    }

    private async release(data: any) {
        if (data !== null && data !== undefined) {
            try {
                await this.syncService!.sync(data);
            } catch (err) {
                log.error(err);
            }
        }
    }

    private async releaseOnce(data: any) {
        if (data !== null && data !== undefined) {
            try {
                await this.syncService!.syncOnce(data);
            } catch (err) {
                log.error(err);
            }
        }
    }

}
