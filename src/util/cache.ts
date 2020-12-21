import superagent from 'superagent';
import { UsageError } from 'clipanion';
import { log } from './log';
import { lightgreen } from '@tosee/color';
import { createHash } from 'crypto';

export type Record = {
    [name: string]: {
        address: string
    }
}

export type Options = {
    salt: string,   //安全签名
    url: string,
    time: number, //秒
    force: boolean, //强制覆盖
    execute: (...args: any) => Record
}

export class Cache {
    private options: Options;

    private records: Record = {};

    private async updateCache(record: Record) {
        const timestamp = Date.now();
        const signature = createHash('sha1').update(`${this.options.salt}${JSON.stringify(record)}${timestamp}`).digest('hex');
        return (await superagent.post(`${this.options.url}?signature=${signature}&timestamp=${timestamp}`).send(record)).body as Record;
    }

    constructor(options: Options) {
        this.options = options;
    }

    async start() {
        const records_from_server = await this.updateCache({});
        const records_from_client = this.options.execute();
        if (this.options.force === false) {
            for (let [k, v] of Object.entries(records_from_client)) {
                if (records_from_server[k] && records_from_server[k].address !== v.address) {
                    throw new UsageError(`the name ${k} remote already has different record,if you want to cover it,use -f option`);
                }
            }
        }
        this.records = await this.updateCache(records_from_client);
        setInterval(async () => {
            log(lightgreen`start update cache`);
            try {
                this.records = await this.updateCache(this.options.execute());
            } catch (e) {
                log(e);
            }
            log(lightgreen`cache update finished`);
        }, this.options.time);
        return this;
    }

    getRecord(name: string) {
        return this.records[name];
    }
}