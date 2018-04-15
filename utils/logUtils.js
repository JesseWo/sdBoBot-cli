'use strict'
const dateFormat = require('./dateUtils')
function d(tag, info) {
    console.log(`${currentTime()} ${tag} ${info}`);
}

function currentTime() {
    return dateFormat('yyyy-MM-dd HH:mm:ss');
}

module.exports = d;