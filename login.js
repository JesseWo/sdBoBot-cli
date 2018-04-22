'use strict'

const { httpGet, httpPost, addHeader } = require('./httpRequst');
const https = require('https');
const log = require('./utils/logUtils');
const readlineSync = require('readline-sync');
const urlParser = require("url");
const cookieParser = require('./utils/cookieParser');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const os = require('os');
const open = require("open");

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36';
const PROTO_HOST = 'https://sso.dtdjzx.gov.cn';
const HOST = 'sso.dtdjzx.gov.cn';

const loginCacheFile = './db/login.json';

let cookie_sid;
let cookie_xsession;
let nextAction;

function checkLogin(next) {
    let jstring = fs.readFileSync(loginCacheFile, 'utf-8');
    if (jstring) {
        const { hassh } = JSON.parse(jstring);
        if (hassh) {
            log.d('检测到缓存的登录信息!');
            next(hassh);
            return;
        }
    }
    log.d('未检测到缓存的登录信息');
    nextAction = next;
    visitLoginPage();
}

/**
 * 打开登录页面(获取SSO-SID)
 */
function visitLoginPage() {
    httpGet({
        protoHost: PROTO_HOST,
        path: '/sso/login',
        headers: {
            'Upgrade-Insecure-Requests': 1,
            'User-Agent': UA,
        }
    }, (statusCode, headers, data) => {
        if (statusCode == 200) {
            const cookieArr = headers['set-cookie'];//返回一个数组
            log.d(`set-cookie: ${cookieArr}`);
            let { 'SSO-SID': sid } = cookieParser.parse(cookieArr[0]);
            cookie_sid = `SSO-SID=${sid}`;
            //获取验证码图片
            refreshValidateCode();
        }
    });
}

/**
 * 刷新验证码
 */
function refreshValidateCode() {
    httpGet({
        protoHost: PROTO_HOST,
        path: '/sso/validateCodeServlet',
        query: { t: Math.random() * 10 },
        headers: {
            'Upgrade-Insecure-Requests': 1,
            'User-Agent': UA,
            'Referer': 'https://sso.dtdjzx.gov.cn/sso/login',
            'Cookie': cookie_sid,
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
        }
    }, (statusCode, headers, rawData) => {
        //缓存验证码图片
        const contentType = headers['content-type'];
        let vcodeFileName = 'invalide';
        if (contentType.search('image/jpeg') != -1) {
            vcodeFileName = './images/vcode.jpg';
        } else if (contentType.search('image/png') != -1) {
            vcodeFileName = './images/vcode.png';
        }
        fs.writeFileSync(vcodeFileName, rawData, 'binary');
        let vcodePath = path.join(__dirname, vcodeFileName);
        log.d(`缓存验证码图片: ${vcodePath}`);
        //提示用户输入
        let username;
        do {
            username = readlineSync.question('请输入用户名:').trim();
        } while (!username);
        let password;
        do {
            password = readlineSync.question('请输入密码:').trim();
        } while (!password);
        //自动打开图片或者OCR自动识别
        openImage(vcodePath);
        let validateCode;
        do {
            validateCode = readlineSync.question('请输入验证码:').trim();
        } while (!validateCode);
        login({
            username: username,
            password: password,
            validateCode: validateCode
        });
    });
}

function openImage(imagePath) {
    open(imagePath);
    // let cmd;
    // switch (os.type()) {
    //     case 'Linux':

    //         break;
    //     case 'Darwin':
    //         // cmd = `open -a /Applications/Preview.app ${imagePath}`
    //         cmd = 'start http://www.baidu.com';
    //         break
    //     case 'Windows_NT':
    //         cmd = 'start http://www.baidu.com';
    //         break;
    // }
    // exec(cmd, (error, stdout, stderr) => {
    //     if (error) {
    //         log.e(`exec error: ${error}`);
    //         return;
    //     }
    //     log.d(`stdout: ${stdout}`);
    //     log.d(`stderr: ${stderr}`);
    // });
}

/**
 * 正式登陆(获取X-session)
 * @param {*} loginInfo 
 */
function login(loginInfo) {
    httpPost({
        protoHost: PROTO_HOST,
        path: '/sso/login',
        headers: {
            'Upgrade-Insecure-Requests': 1,
            'User-Agent': UA,
            'Origin': PROTO_HOST,
            'Referer': 'https://sso.dtdjzx.gov.cn/sso/login',
            'Cookie': cookie_sid,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: querystring.stringify(loginInfo)
    }, (statusCode, headers, rawData) => {
        if (statusCode == 302) {
            let location = headers.location.trim();
            log.d(`redirect to: ${location}`);
            if (location == 'https://sso.dtdjzx.gov.cn/sso/login?error') {
                //登录失败
                log.e('用户名或密码错误!请重新输入..');
                //刷新验证码, 重新登录
                refreshValidateCode(cookie);
            } else {
                //登录成功
                httpGet({
                    protoHost: 'https://www.dtdjzx.gov.cn',
                    path: '/member/',
                    headers: {
                        'Host': 'www.dtdjzx.gov.cn',
                        'Referer': 'https://sso.dtdjzx.gov.cn/sso/login',
                        'Upgrade-Insecure-Requests': 1,
                        'User-Agent': UA
                    }
                }, (statusCode, headers, rawData) => {
                    const cookieArr = headers['set-cookie'];//返回一个数组
                    log.d(`set-cookie: ${cookieArr}`);
                    let { 'X-SESSION': xSession } = cookieParser.parse(cookieArr[0]);
                    cookie_xsession = `X-SESSION=${xSession}`;
                    getObjsStep1();
                });
            }
        }
    });
}

/**
 * 根据cookie获取重定向地址
 * GET https://sso.dtdjzx.gov.cn/sso/oauth/authorize?client_id=party-build-knowledge&redirect_uri=http://xxjs.dtdjzx.gov.cn/quiz-api/user/sso_callback%3fc_type=code&response_type=code
 */
function getObjsStep1() {
    httpGet({
        protoHost: PROTO_HOST,
        path: '/sso/oauth/authorize',
        query: {
            'client_id': 'party-build-knowledge',
            'redirect_uri': 'http://xxjs.dtdjzx.gov.cn/quiz-api/user/sso_callback?c_type=code',
            'response_type': 'code'
        },
        headers: {
            'Host': HOST,
            'Referer': 'http://xxjs.dtdjzx.gov.cn/',
            'Upgrade-Insecure-Requests': 1,
            'User-Agent': UA,
            'Cookie': `${cookie_sid}; ${cookie_xsession}`
        }
    }, (statusCode, headers, data) => {
        if (statusCode == 302) {
            const { location } = headers;
            log.d(`redirect to: ${location}`);
            getObjsStep2(location);
        }
    });
}

function getObjsStep2(urlStr) {
    let { protocol, hostname, pathname, port, query } = urlParser.parse(urlStr, true);
    httpGet({
        protoHost: `${protocol}//${hostname}`,
        path: pathname,
        query: query,
        headers: {
            'Host': hostname,
            'Referer': 'http://xxjs.dtdjzx.gov.cn/',
            'Upgrade-Insecure-Requests': 1,
            'User-Agent': UA,
            'Cookie': `JSESSIONID=C201B14DB29B92E20177737E22CD290D; ${cookie_xsession}`
        }

    }, (statusCode, headers, data) => {
        if (statusCode == 302) {
            const { location } = headers;
            log.d(`redirect to: ${location}`);
            //解析重定向的url,获取hassh
            //http://xxjs.dtdjzx.gov.cn/index.html?h=qwertyuiop
            let { query: { h } } = urlParser.parse(location, true);
            if (h) {
                log.d('登录成功!');
                //最终答题需要的登录信息
                //缓存登录信息
                let userInfo = JSON.stringify({
                    usetype: "0",
                    hassh: h,
                    orgId: "0"
                });
                fs.writeFile(loginCacheFile, userInfo, (e) => {
                    if (e) log.e(e);
                });

                nextAction(h);
            }
        }
    });
}

module.exports = checkLogin;

// checkLogin();