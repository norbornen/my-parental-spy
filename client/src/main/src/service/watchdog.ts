import log from 'electron-log';
import { app, powerMonitor } from 'electron';
import SyncService from './sync';
import InfoService from './info';
import { boundMethod } from 'autobind-decorator';


type EventType = 'power' | 'net';
type EventCollectionItem = { type: EventType; date: Date; payload?: string };
type PowerEventType = 'start' | 'stop' | 'suspend' | 'resume' | 'shutdown';
type PowerMonitorFnDictionary = { [key in Partial<PowerEventType>]: () => void };


export default class WatchdogService {
    private eventCollection: EventCollectionItem[] = [];

    private infoService?: InfoService;
    private infoTimeout?: number;
    private syncService?: SyncService;
    private syncTimeout = 2 * 60 * 1000;
    private syncTimeoutRef?: NodeJS.Timeout;

    private powerMonitorListeners?: PowerMonitorFnDictionary;

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
        if (this.infoService) {
            try {
                this.infoService.removeAllListeners();
                await this.infoService.destroy();
                this.infoService = undefined;
            } catch (err) {
                log.error(err);
            }
        }

        if (this.powerMonitorListeners) {
            const powerMonitorFn = this.powerMonitorListeners!;
            (Object.keys(powerMonitorFn) as PowerEventType[]).forEach((key) => {
                powerMonitor.off(key as any, powerMonitorFn[key]);
            });
            this.powerMonitorListeners = undefined;
        }

        if (this.syncTimeoutRef) {
            clearTimeout(this.syncTimeoutRef);
            this.syncTimeoutRef = undefined;
        }


        this.powerEventRegister('stop');
        await this.release(true);

        try {
            await this.syncService?.destroy();
            this.syncService = undefined;
        } catch (err) {
            log.error(err);
        }
    }

    @boundMethod
    private init() {
        this.syncService = new SyncService(this.uid, this.endpoint);

        //
        this.powerEventRegister('start');

        if (app.isReady()) {
            this.powerMonitorHandler();
        } else {
            app.once('ready', this.powerMonitorHandler);
        }

        this.infoService = new InfoService(this.infoTimeout);
        this.infoService
            .on('net', (d) => {
                (Array.isArray(d) ? d : [d]).forEach((x) => this.eventRegister('net', x));
            })
            .on('power', (d) => {
                (Array.isArray(d) ? d : [d]).forEach((x) => this.powerEventRegister(x));
            });
        //

        this.releaseHandler();
    }

    private releaseHandler() {
        this.syncTimeoutRef = setTimeout(async () => {
            this.releaseHandler();
            await this.release();
        }, this.syncTimeout);
    }

    @boundMethod
    private powerMonitorHandler() {
        this.powerMonitorListeners = (['suspend', 'resume', 'shutdown'] as Exclude<PowerEventType, 'start' | 'stop'>[]).reduce((acc, key) => {
            acc[key] = () => this.powerEventRegister(key);
            powerMonitor.on(key as any, acc[key]);
            return acc;
        }, {} as PowerMonitorFnDictionary);
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

    private async release(doOnce: boolean = false) {
        const eventCollection = this.eventCollection;
        this.eventCollection = [];
        if (eventCollection.length > 0) {
            try {
                if (doOnce) {
                    await this.syncService!.syncOnce(eventCollection);
                } else {
                    await this.syncService!.sync(eventCollection);
                }
            } catch (err) {
                log.error(err);
            }
        }
    }

}
