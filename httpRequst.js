'use strict';

const http = require('http');
const querystring = require('querystring');

let HOST = 'xxjs.dtdjzx.gov.cn';

let commonHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
    'Origin': 'http://xxjs.dtdjzx.gov.cn',
    // 'Referer': 'http://xxjs.dtdjzx.gov.cn/kaishijingsai.html'  //请求来源
    // Cookie: X-SESSION=e1f1733f-103f-4013-96e2-7f17ad8b026b
    //X-Requested-With: XMLHttpRequest
};

function httpRequest(options, data, callback) {
    console.log(`${options.method}: ${options.hostname}${options.path}`);

    const req = http.request(options, (res) => {
        console.log(`状态码: ${res.statusCode}`);
        console.log(`响应头: ${JSON.stringify(res.headers)}`);
        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);
                // console.log(parsedData);
                callback(parsedData);
            } catch (e) {
                console.error(e.message);
            }
        });
    }).on('error', (e) => {
        console.error(`请求遇到问题: ${e.message}`);
    });

    // 写入数据到请求主体
    req.write(data);
    req.end();
}

function httpGet({ host = HOST, port = 80, headers = commonHeaders, path, queryParams, callback }) {
    const options = {
        hostname: host,
        port: port,
        path: `${path}?${querystring.stringify(queryParams)}`,
        method: 'GET',
        headers: headers
    };
    httpRequest(options, '', callback);
}

function httpPost({ host = HOST, port = 80, headers = commonHeaders, path, body, callback }) {
    const options = {
        hostname: host,
        port: port,
        path: path,
        method: 'POST',
        headers: headers
    };
    httpRequest(options, body, callback);
}

module.exports = httpRequest;