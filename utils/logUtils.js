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

let log = {
    d: info => {
        if (debug)
            console.log(`${currentTime()} ${info}`.debug);
    },
    i: info => {
        console.log(info);
    },
    w: info => {
        console.log(info.warn);
    },
    e: info => {
        console.error(`${currentTime()} ${info}`.error);
    }
}

function currentTime() {
    return dateFormat();
}

module.exports = log;