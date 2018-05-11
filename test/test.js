#!/usr/bin/env node
'use strict';

var argv = require('yargs')
    .option('i', {
        alias: 'identity',
        demand: false,
        default: 'member',
        describe: 'your identity: member(party member) or people?.',
        type: 'string'
    })
    .usage('Usage: beacon [options]')//用法格式
    .example('beacon -i member', 'Your identity is party member.')
    .help('h')
    .alias('h', 'help')
    .epilog('Jessewo | copyright 2018')//出现在帮助信息的结尾
    .argv;

console.log(argv.i);

