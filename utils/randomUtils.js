'use strict';

function random(start, end) {
    return Math.floor((Math.random() * (end - start) + start));
}

module.exports = random;