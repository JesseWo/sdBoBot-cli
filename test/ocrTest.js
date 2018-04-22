'use strict';

var tesseract = require('node-tesseract');
const path = require('path');

let a = path.join(__dirname, '../images/vcode.jpg');
// Recognize text of any language in any format
tesseract.process(a, function (err, text) {
    if (err) {
        console.error(err);
    } else {
        console.log(text);
    }
});

// Recognize German text in a single uniform block of text and set the binary path

var options = {
    l: 'deu',
    psm: 6,
    binary: '/usr/local/bin/tesseract'
};

// tesseract.process(__dirname + '/path/to/image.jpg', options, function(err, text) {
// 	if(err) {
// 		console.error(err);
// 	} else {
// 		console.log(text);
// 	}
// });

