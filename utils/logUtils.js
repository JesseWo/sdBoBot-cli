'use strict'

let colors = require('colors');
colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'red',
    info: 'green',
    data: 'blue',
    help: 'cyan',
    warn: 'yellow',
    debug: 'magenta',
    error: 'red'
});

const dateFormat = require('./dateUtils');
const {debug} = require('../config');

const iconv = require('iconv-lite');
const os = require("os");

let log = {
    d: info => {
        if (debug) {
            info = transform(`${currentTime()} ${info}`);
            console.log(info.debug);
        }
    },
    i: info => {
        info = transform(info);
        console.log(info);
    },
    w: info => {
        info = transform(info);
        console.log(info.warn);
    },
    e: info => {
        info = transform(`${currentTime()} ${info}`);
        console.error(info.error);
    }
};

/**
 * 解决Windows控制台输出中文乱符问题
 * @param src
 * @returns {*}
 */
function transform(src) {
    if (src && os.type() === "Windows_NT") {
        src = iconv.decode(new Buffer(src, 'binary'), 'cp936');
    }
    return src;
}

function currentTime() {
    return dateFormat();
}

module.exports = log;