import moment from 'moment';
import { lightyellow } from '@tosee/color';

export function log(...args: any[]) {
    console.log(lightyellow`[${moment().format('YYYY-MM-DD HH:mm:ss')}]`, ...args);
}