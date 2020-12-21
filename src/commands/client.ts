#! /usr/bin/env node
import { Command, UsageError } from 'clipanion';
import mdns from "multicast-dns";
import { Cache } from '../util/cache';
import { networkInterfaces, platform } from 'os';
import { log } from '../util/log';
import { lightgreen } from '@tosee/color';

export default class Client extends Command {
    @Command.Array(`--name`)
    public names: string[];

    @Command.String(`-s,--server`)
    public server: string;

    @Command.String(`--salt`)
    public salt: string;

    @Command.String(`-p,--port`)
    public port: string;

    @Command.Boolean(`-f,--force`)
    public force: boolean = false;

    @Command.Boolean(`--print`)
    public print: boolean = false;

    @Command.Path(`client`)
    async execute() {
        if (this.server == undefined) {
            throw new UsageError(`-s,--server is needed for this commond`);
        }
        if (this.salt == undefined) {
            throw new UsageError(`--salt is needed for this commond`);
        }
        if (this.port == undefined) {
            throw new UsageError(`-p,--port is needed for this commond`);
        }
        let cache: Cache;
        let key = platform() == "win32" ? "以太网" : "eth0";
        if (this.names == undefined || this.names.length == 0) {
            cache = await (new Cache({
                salt: this.salt,
                time: 5 * 60 * 1000,
                url: `http://${this.server}:${this.port}`,
                force: this.force,
                execute: () => {
                    return {
                    }
                }
            })).start();
        } else {
            cache = await (new Cache({
                salt: this.salt,
                time: 5 * 60 * 1000,
                url: `http://${this.server}:${this.port}`,
                force: this.force,
                execute: () => {
                    const internal_ip = networkInterfaces()[key].filter(i => i.family == "IPv4")[0].address;
                    const records = this.names.reduce((pre, curr) => {
                        pre[curr] = {
                            address: internal_ip
                        };
                        return pre;
                    }, {})
                    return records;
                }
            })).start();
        }
        const instance = mdns();
        instance.on('warning', function (err) {
            console.log(err.stack);
        })
        instance.on('response', function (response) {
        })
        instance.on('query', function (query) {
            query.questions.forEach(function (q) {
                if (q.type === 'A') {
                    const record = cache.getRecord(q.name);
                    if (record !== undefined) {
                        log(lightgreen`cache hit name:${q.name} address:${record.address}`);
                        instance.respond({
                            answers: [{
                                name: q.name,
                                type: 'A',
                                ttl: 300,
                                data: record.address
                            }]
                        })
                    }
                }
            })
        });
        log(lightgreen`client start success`);
    }
}