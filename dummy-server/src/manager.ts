import ServerService from './service/server';
import DataHandleService from './service/data';
import { boundMethod } from 'autobind-decorator';


export default class Manager {
    private serverService!: ServerService;

    constructor(){
        this.serverService = new ServerService(); // maybe port number

        this.serverService.on('sync', (client_uid: string, ...args: any[]) => process.nextTick(() => {
            new DataHandleService(client_uid).serverSyncData(args.shift(), args.shift());
        }));

    }
}
