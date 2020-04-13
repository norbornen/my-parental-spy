import * as path from 'path';
import { app, Tray, Menu } from 'electron';
import log from 'electron-log';
import WatchdogService from './service/watchdog';

const gotTheSingleInstanceLock = app.requestSingleInstanceLock();
let appIcon: Tray;
let watchdog: WatchdogService;
let loggedout: boolean = false;


if (!gotTheSingleInstanceLock) {
    app.quit();
    process.exit(1);
}

// app.setLoginItemSettings(settings)

app.on('ready', () => {
    log.verbose(`Application runing: ${new Date().toString()}`);
    log.verbose(`   logs: ${app.getPath('logs')}, appData: ${app.getPath('appData')}, isPackaged=${app.isPackaged}`);

    watchdog = new WatchdogService();

    app.dock?.hide();

    createTray();
});

app.on('activate', () => {
    if (watchdog === undefined || watchdog === null) {
        watchdog = new WatchdogService();
    }
    if (appIcon === undefined || appIcon === null) {
        createTray();
    }
});

app.on('second-instance', () => {
    log.warn(`Try second application instance runing...`);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', (event) => {
    if (loggedout === false) {
        event.preventDefault();

        (watchdog ? watchdog.destroy() : Promise.resolve())
            .catch((err) => log.error(err))
            .finally(() => {
                loggedout = true;
                appIcon?.destroy();
                app.quit();
            });
    }
});

app.on('will-quit', () => {
    log.verbose(`Application quit: ${new Date().toString()}\n\n`);
});

async function createTray() {
    const iconName = process.platform === 'win32' ? 'windows-icon.png' : 'iconTemplate.png'
    const iconPath = path.join(__dirname, '../assets/tray', iconName);

    appIcon = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        // { type: 'separator' },
        { label: 'Quit', role: 'quit' }
    ]);
    appIcon.setContextMenu(contextMenu);

    appIcon.setToolTip('Intel® Xeon® Processor E5-2600');
}
