'use strict'

const {debug, myUrl: MY_URL, loginBaseUrl: BASE_URL} = require('./config');
const agent = require('superagent').agent();//auto manage cookie
const log = require('./utils/logUtils');
const readlineSync = require('readline-sync');
const urlParser = require("url");
const cookieParser = require('./utils/cookieParser');
const fs = require('fs');
const path = require('path');
const os = require('os');
const open = require("open");

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36';
const HOST = 'sso.dtdjzx.gov.cn';

if (!fs.existsSync('./cache')) {
    fs.mkdirSync('./cache')
}
const objsCacheFile = './cache/objs.json';
const loginCacheFile = './cache/login.json';

let cookie_sid;

//验证码识别失败次数, 超过2次则人工识别
let vcodeOcrFailedTimes = 0;

function checkLogin() {
    let hassh, xSession;
    try {
        hassh = require(objsCacheFile).hassh;
        xSession = require(loginCacheFile)['X-SESSION'];
    } catch (error) {
        //ignore
    }
    if (hassh && xSession) {
        log.d('检测到缓存的登录信息!');
        return {
            usetype: "0",
            hassh: hassh,
            orgId: "0",
            session: xSession
        };
    } else {
        log.d('未检测到缓存的登录信息');
        return null;
    }
}

async function startLogin() {
    try {
        let info = await collectLoginInfo();
        let session = await submit(info);
        if (session) {
            //登录成功
            return await onLoginSuccess(info, session);
        } else {
            //登录失败
            log.e('用户名或密码错误!请重新输入..');
            //刷新验证码, 重新登录
            return await startLogin();
        }
    } catch (e) {
        log.e(e);
    }
}

/**
 * 打开登录页面(获取SSO-SID)
 */
function visitLoginPage() {
    return new Promise((resolve, reject) => {
        agent
            .get(BASE_URL + '/sso/login')
            .set({
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': UA,
            })
            .then(res => {
                if (res.status === 200) {
                    const cookieArr = res.header['set-cookie']; //返回一个数组
                    log.d(`set-cookie: ${cookieArr}`);
                    let {'SSO-SID': sid} = cookieParser.parse(cookieArr[0]);
                    cookie_sid = `SSO-SID=${sid}`;

                    resolve();
                } else {
                    reject();
                }
            });
    });
}

/**
 * 收集登录所需的信息
 * @returns {Promise<{username: *, password: *, validateCode: *}>}
 */
async function collectLoginInfo() {
    try {
        //获取验证码图片
        let {body: imageBuffer, type: contentType} = await getVcode();
        //ocr识别
        let validateCode;
        if (vcodeOcrFailedTimes < 2) {
            validateCode = await vcodeOcr(imageBuffer);
            log.d(`vcode ocr result: ${validateCode}`);
        }
        //从缓存读取用户名和密码
        let username, password;
        try {
            let login = require(loginCacheFile);
            username = login.username;
            password = login.password;
        } catch (e) {
            //ignore
        }
        if (username && password) {
            let useCache = readlineSync.question(`检测到上次登录账号:${username}, 若继续登录请直接回车,若更换账号请输入 N 后回车: `).trim();
            if (/^[N]$/i.test(useCache)) {
                username = null;
                password = null;
            }
        }
        //若读取失败则提示用户输入
        while (!username) {
            username = readlineSync.question('请输入用户名(手机号):').trim();
        }
        while (!password) {
            password = readlineSync.question('请输入密码:').trim();
        }
        //若未能识别则缓存验证码图片并自动打开,手动输入
        if (!validateCode) {
            //缓存验证码图片
            let vcodeFileName = './images/vcode';
            if (/image\/jpeg/.test(contentType)) {
                vcodeFileName += '.jpg';
            } else if (/image\/png/.test(contentType)) {
                vcodeFileName += '.png';
            }
            fs.writeFileSync(vcodeFileName, imageBuffer, 'binary');
            let vcodePath = path.join(__dirname, vcodeFileName);
            log.d(`缓存验证码图片: ${vcodePath}`);
            //自动打开图片
            openImage(vcodePath);
            //提示用户输入 验证码
            do {
                validateCode = readlineSync.question('请输入验证码:').trim();
            } while (!validateCode);
        }
        return {
            username: username,
            password: password,
            validateCode: validateCode
        };
    } catch (e) {
        log.e(e);
    }

}

function getVcode() {
    return new Promise((resolve, reject) => {
        agent
            .get(BASE_URL + "/sso/validateCodeServlet")
            .query({t: Math.random() * 10})
            .set({
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': UA,
                'Referer': 'https://sso.dtdjzx.gov.cn/sso/login',
                'Cookie': cookie_sid,
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
            })
            .then(res => {
                if (res.error) {
                    reject(res.error);
                } else {
                    resolve(res);
                }
            })
            .catch(err => {
                log.e(err);
            })
    });
}

function vcodeOcr(buffer) {
    return new Promise((resolve, reject) => {
        agent
            .post(`${MY_URL}/sdbeacononline/vcodeocr`)
            .attach('file', buffer, "vcode")//必须加上文件名
            .then(res => {
                vcodeOcrFailedTimes++;
                if (res.error) {
                    reject(res.error);
                } else {
                    resolve(res.body.data);
                }
            })
            .catch(err => log.e(err));
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
 * 正式登陆
 * @param loginInfo
 * @returns {Promise<void>}
 */
function submit(loginInfo) {
    return new Promise((resolve, reject) => {
        agent
            .post(BASE_URL + "/sso/login")
            .redirects(3)//重定向三次后拿到sessionId
            .set({
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': UA,
                'Origin': BASE_URL,
                'Referer': 'https://sso.dtdjzx.gov.cn/sso/login',
                'Cookie': cookie_sid,
            })
            .type('form')
            .send(loginInfo)
            .then(res => {
                resolve('');//登录失败
            })
            .catch(err => {
                if (err.status === 302) {
                    let cookieArr = err.response.header['set-cookie'];
                    log.d(`set-cookie: ${cookieArr}`);
                    let {'X-SESSION': xSession} = cookieParser.parse(cookieArr[0]);
                    resolve(xSession ? `X-SESSION=${xSession}` : '');//根据是否拿到session判断登录成功与否
                } else {
                    reject(`status: ${err.status}, no redirect!`);
                }
            });
    });
}

/**
 * 缓存登录信息
 * GET https://sso.dtdjzx.gov.cn/sso/oauth/authorize?client_id=party-build-knowledge&redirect_uri=http://xxjs.dtdjzx.gov.cn/quiz-api/user/sso_callback%3fc_type=code&response_type=code
 * @returns {Promise<void>}
 */
async function onLoginSuccess({username, password}, cookie_xsession) {
    try {
        //登录成功则缓存登录信息
        fs.writeFile(loginCacheFile, JSON.stringify({
            username,
            password,
            'X-SESSION': cookie_xsession,
            'SSO-SID': cookie_sid
        }), (e) => {
            if (e) log.e(e);
        });
        //获取objs
        let location = await new Promise((resolve, reject) => {
            agent
                .get(BASE_URL + '/sso/oauth/authorize')
                .redirects(1)//重定向一次
                .set({
                    'Host': HOST,
                    'Referer': 'http://xxjs.dtdjzx.gov.cn/',
                    'Upgrade-Insecure-Requests': 1,
                    'User-Agent': UA,
                    'Cookie': `${cookie_sid}; ${cookie_xsession}`
                })
                .query({
                    'client_id': 'party-build-knowledge',
                    'redirect_uri': 'http://xxjs.dtdjzx.gov.cn/quiz-api/user/sso_callback?c_type=code',
                    'response_type': 'code'
                })
                .catch(err => {
                    if (err.status === 302) {
                        const {location} = err.response.header;
                        log.d(`redirect to: ${location}`);
                        resolve(location);
                    } else {
                        reject(`status: ${err.status}, no redirect!`);
                    }
                })
        });
        //解析重定向的url,获取hassh
        //http://xxjs.dtdjzx.gov.cn/index.html?h=qwertyuiop
        let {query: {h}} = urlParser.parse(location, true);
        if (h) {
            log.d('登录成功!');
            //最终答题需要的登录信息
            //缓存登录信息
            let objs = {
                usetype: "0",
                hassh: h,
                orgId: "0",
                session: cookie_xsession
            };
            fs.writeFile(objsCacheFile, JSON.stringify(objs), (e) => {
                if (e) log.e(e);
            });
            return objs;
        }
    } catch (e) {
        log.e(e);
    }
}

async function main(identity) {
    let objs;
    if (identity === "people") {
        //群众
        let mobile = readlineSync.question('您的身份是[群众],请输入手机号开始答题: ').trim();
        while (!mobile.match(/^1[\d]{10}$/g)) {
            mobile = readlineSync.question('手机号格式错误,请重新输入:\n').trim();
        }
        objs = {
            usetype: "1",
            hassh: mobile,
        };
    } else {
        //党员
        objs = checkLogin();
        if (!objs) {
            await visitLoginPage();
            objs = await startLogin();
        }
    }
    return objs;
}

module.exports = main;

//for test
if (require.main === module) {
    main();
}