import log from 'electron-log';
import { powerMonitor } from 'electron';
import SyncService from './sync';
import InfoService from './info';
import { boundMethod } from 'autobind-decorator';


type EventType = 'power' | 'net';
type EventCollectionItem = { type: EventType; date: Date; payload?: string };
type PowerEventType = 'start' | 'stop' | 'suspend' | 'resume' | 'shutdown';
type PowerMonitorFnDictionary = { [key in Partial<PowerEventType>]: () => void };

export default class WatchdogService {
    private _syncService?: SyncService;
    private _infoService?: InfoService;
    private infoTimeout = 2 * 1000;
    // private syncTimeout = 2 * 60 * 1000;
    private syncTimeout = 30 * 1000;
    private infoTimeoutRef?: NodeJS.Timeout;
    private syncTimeoutRef?: NodeJS.Timeout;

    private powerMonitorFn?: PowerMonitorFnDictionary;
    private eventCollection: EventCollectionItem[] = [];

    constructor() {
        this.powerEventRegister('start');
        process.nextTick(this.powerMonitorHandler);
        process.nextTick(this.releaseHandler);
        process.nextTick(this.infoHandler);
    }

    public async destroy() {
        if (this.infoTimeoutRef) {
            clearTimeout(this.infoTimeoutRef);
            this.infoTimeoutRef = undefined;
        }
        if (this.syncTimeoutRef) {
            clearTimeout(this.syncTimeoutRef);
            this.syncTimeoutRef = undefined;
        }
        if (this.powerMonitorFn) {
            const powerMonitorFn = this.powerMonitorFn!;
            (Object.keys(powerMonitorFn) as PowerEventType[]).forEach((key) => {
                powerMonitor.off(key as any, powerMonitorFn[key]);
            });
            this.powerMonitorFn = undefined;
        }

        try {
            await this.infoService?.destroy();
            this._infoService = undefined;
        } catch (err) {
            log.error(err);
        }

        try {
            this.powerEventRegister('stop');
            await this.release(true);
        } catch (err) {
            log.error(err);
        }

        try {
            await this.syncService?.destroy();
            this._syncService = undefined;
        } catch (err) {
            log.error(err);
        }
    }

    @boundMethod
    private infoHandler() {
        this.infoTimeoutRef = setTimeout(async () => {
            this.infoHandler();
            try {
                const data = await this.infoService.slice();
                data?.forEach((x) => this.eventRegister('net', x));
            } catch (err) {
                log.error(err);
            }
        }, this.infoTimeout);
    }

    @boundMethod
    private releaseHandler() {
        this.syncTimeoutRef = setTimeout(async () => {
            this.releaseHandler();
            await this.release();
        }, this.syncTimeout);
    }

    @boundMethod
    private powerMonitorHandler() {
        this.powerMonitorFn = (['suspend', 'resume', 'shutdown'] as Exclude<PowerEventType, 'start' | 'stop'>[]).reduce((acc, key) => {
            const fn = acc[key] = () => this.powerEventRegister(key);
            powerMonitor.on(key as any, fn);
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
                    await this.syncService.syncOnce(eventCollection);
                } else {
                    await this.syncService.sync(eventCollection);
                }
            } catch (err) {
                log.error(err);
            }
        }
    }

    get infoService() {
        return this._infoService || (this._infoService = new InfoService());
    }

    get syncService() {
        return this._syncService || (this._syncService = new SyncService());
    }

}
