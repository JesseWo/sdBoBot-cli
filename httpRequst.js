'use strict';

const http = require('http');
const https = require('https');
const querystring = require('querystring');
const urlParser = require("url");
const log = require('./utils/logUtils');

let BASE_URL = 'http://xxjs.dtdjzx.gov.cn';

let commonHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36',
    'Origin': 'http://xxjs.dtdjzx.gov.cn',
    'Referer': 'http://xxjs.dtdjzx.gov.cn/kaishijingsai.html', //请求来源
    'system-type': 'web',
    // Cookie: X-SESSION=e1f1733f-103f-4013-96e2-7f17ad8b026b
    //X-Requested-With: XMLHttpRequest
};

function addHeader(key, value) {
    commonHeaders[key] = value;
}

function httpRequest(protocol, options, data, callback) {
    console.log(`${options.method}: ${protocol}//${options.hostname}${options.path}`);
    let client = protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
        const {statusCode, headers} = res;
        console.log(`状态码: ${statusCode}`);
        console.log(`响应头: ${JSON.stringify(headers)}`);
        const contentType = headers['content-type'];
        if (/image\//.test(contentType)) {
            res.setEncoding('binary');
        } else {
            res.setEncoding('utf8');
        }
        let rawData = '';
        res.on('data', (chunk) => {
            rawData += chunk;
        });
        res.on('end', () => {
            try {
                //对于json数据,优先解析为obj 然后再传递
                if (/application\/json/.test(contentType)) {
                    // log.d(rawData);
                    const body = JSON.parse(rawData);
                    callback(statusCode, headers, body);
                } else {
                    callback(statusCode, headers, rawData);
                }
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

function get({baseUrl = BASE_URL, headers = commonHeaders, path, query}, callback) {
    let {protocol, hostname, port} = urlParser.parse(baseUrl);
    port = port || (protocol === 'https:' ? 443 : 80);
    const options = {
        hostname: hostname,
        port: port,
        path: `${path}?${querystring.stringify(query)}`,
        method: 'GET',
        headers: headers
    };
    httpRequest(protocol, options, '', callback);
}

function post({baseUrl = BASE_URL, headers = commonHeaders, path, body = ''}, callback) {
    let {protocol, hostname, port} = urlParser.parse(baseUrl);
    port = port || (protocol === 'https:' ? 443 : 80);
    const options = {
        hostname: hostname,
        port: port,
        path: path,
        method: 'POST',
        headers: headers
    };
    httpRequest(protocol, options, body, callback);
}

module.exports = {
    httpGet: get,
    httpPost: post,
    addHeader: addHeader
};