#! /usr/bin/env node
import { Command, UsageError } from 'clipanion';
import { Record } from '../util/cache';
import Koa from "koa";
import { existsSync, readFileSync } from 'fs';
import body from 'koa-bodyparser';
import { log } from '../util/log';
import { lightgreen } from '@tosee/color';
import { createHash } from 'crypto';

export default class Server extends Command {
    static usage = Command.Usage({
        description: `start server of ndns`,
        examples: [[
            `start a server without config`,
            `$0 -p 8676 --salt secret`,
        ],
        [
            `start a client with config`,
            `$0 -p 8676 -c ./records.json`,
        ]],
    });


    @Command.String(`-p,--port`, { description: "The server port" })
    public port: string;

    @Command.String(`-c,--config`, { description: "Preload records" })
    public config: string;

    @Command.String(`--salt`, { description: "Content signature string" })
    public salt: string;

    @Command.Path(`server`)
    async execute() {
        if (this.port == undefined) {
            throw new UsageError(`-p,--port is needed for this commond`);
        }
        if (this.salt == undefined) {
            throw new UsageError(`--salt is needed for this commond`);
        }
        let records: Record = {};
        if (this.config !== undefined) {
            if (!existsSync(this.config)) {
                throw new UsageError(`-c,--config should be a json`);
            }
            try {
                records = JSON.parse(readFileSync(this.config).toString());
            } catch (e) {
                throw new UsageError(`-c,--config should be a json`);
            }
        }
        const app = new Koa();
        app.use(body());
        app.use(async ctx => {
            log(lightgreen`update cache`);
            const { signature, timestamp } = ctx.query;
            if (!signature || !timestamp || signature !== createHash('sha1').update(`${this.salt}${JSON.stringify(ctx.request?.body ?? {})}${timestamp}`).digest('hex')) {
                ctx.status = 403;
                ctx.body = 'wrong signature'
                return;
            }
            records = Object.assign(records, ctx.request.body);
            ctx.body = records;
        })
        app.listen(this.port);
        log(lightgreen`server start success`);
    }
}