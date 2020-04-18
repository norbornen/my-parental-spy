import { app, dialog } from 'electron';
import log from 'electron-log';
import Launcher from './launcher';

console.log = log.log; // indev

const launcher = new Launcher();

launcher.init().catch((err) => {
    let message: string;
    if (err instanceof Error) {
        message = err.message;
        log.error(`Init failed: ${message}`)
        log.error(err.stack);
    } else {
        message = err;
    }

    if (err && app.isReady()) {
        dialog.showErrorBox('Spy error: ', message);
    }

    app.quit();
});

process.on('uncaughtException', (err) => {
    const { message, stack } = err;
    log.error(`Uncaught exception: ${message}`)
    log.error(stack, app.isReady())

    if (app.isReady()) {
        dialog.showErrorBox('Spy error: ', message)
    }
});

