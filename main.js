#!/usr/bin/env node
'use strict';
/**
 * 控制train_data输出
 */
const {debug, myUrl, baseUrl, mockHeaders} = require('./config');

//解析命令行参数
let argv = require('yargs')
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

const request = require('superagent');
const fs = require('fs');
const log = require('./utils/logUtils');
const dateFormat = require('./utils/dateUtils');
const random = require('./utils/randomUtils');
//登录模块
const login = require('./login');

//控制台键盘输入读取
const readlineSync = require('readline-sync');

let failureList;

/**
 * mock 点击数据
 * 下一题按钮
 * 左上角(552,804)
 * 右下角(644,832)
 */
function mockHumanBehaviors(totalSubject) {
    let clickTimes = totalSubject - 1;
    let clientXArr = [];
    let clientXArrY = [];
    let maxArr = [];
    let obj = {};
    for (let i = 0; i < clickTimes; i++) {
        let x = random(552, 644);
        clientXArr.push(x);
        let y = random(804, 832);
        clientXArrY.push(y);

        if (obj[x]) {
            obj[x]++;
            maxArr.push(obj[clientXArr[i]]);
        } else {
            obj[x] = 1
        }
    }
    maxArr = maxArr.sort(function (x, y) {
        return x - y
    });
    let repeatX = maxArr.length > 0 ? maxArr[maxArr.length - 1] : 0; //重复x 坐标的次数

    return {
        sameNum: repeatX,
        clickX: clientXArr.join(','),
        clickY: clientXArrY.join(',')
    };
}

/**
 * 查询答案
 * @param userId
 * @param subjectInfoList
 * @returns {Promise<any>}
 */
function queryAnswer(userId, subjectInfoList) {
    log.d('答案查询中...');
    return new Promise((resolve, reject) => {
        request
            .post(myUrl + "/sdbeacononline/queryanswer")
            .send({userId, subjectInfoList})
            .then(res => {
                let queryResult = res.body.data;
                log.i(queryResult.queryLog);
                resolve(queryResult);
            })
            .catch(err => {
                log.e(err);
            })
    });
}

/**
 * 更新错题集
 * @param {Iterable} failureList
 */
function updateFailureList(failureList) {
    request
        .post(myUrl + "/sdbeacononline/updatefailurelist")
        .send(failureList)
        .then(res => log.d('错题上传成功!'))
        .catch(err => log.e(err));
}

/**
 * 构建交卷的body
 * @param subject
 * @param queryResult
 * @returns {Promise<any>}
 */
function handleResult(subject, queryResult) {
    return new Promise((resolve, reject) => {
        const {recordId, roundOnlyId, orderId, totalSubject} = subject;
        let {answerList, failureMap} = queryResult;

        //对于查询失败的问题抛给用户
        if (failureMap) {
            log.e(`有${Object.values(failureMap).length}个问题查询失败!\n`);

            for (let key in failureMap) {
                let index = key;
                let item = failureMap[key];
                const subjectTitle = item.subjectTitle;
                const subjectType = item.subjectType;
                const optionInfoList = item.optionInfoList;

                log.i(`${index + 1}.[${subjectType === '0' ? '单选' : '多选'}] ${subjectTitle}`);
                optionInfoList.forEach(opt => log.i(`${opt.optionType}.${opt.optionTitle}`));

                let inputStr = readlineSync.question('请输入答案(示例: 若单选则输入 A ;若多选则输入 ABC): ').trim().toUpperCase();
                // // Handle the secret text (e.g. password).
                // var favFood = readlineSync.question('What is your favorite food? ', {
                //     hideEchoBack: true // The typed text on screen is hidden by `*` (default).
                // });
                while ((subjectType === '0' && !inputStr.match(/^[A-D]{1}$/g))
                || (subjectType === '1' && !inputStr.match(/^[A-D]{1,4}$/g))) {
                    inputStr = readlineSync.question('输入格式错误, 请重新输入:').trim().toUpperCase();
                }
                let correctedOpts = inputStr.match(/./g).join(',');
                log.w(`您输入的是: ${correctedOpts}\n`);
                //将输入的答案添加到错题集里
                item.answer = correctedOpts;
                for (let i = 0; i < inputStr.length; i++) {
                    let c = inputStr.charAt(i);
                    optionInfoList.forEach(opt => {
                        if (opt.optionType.toUpperCase() == c) {
                            opt.isRight = '1';
                        } else {
                            opt.isRight = opt.isRight || '0';
                        }
                    });
                }

                //构建手动输入的结果
                let answer = {};
                answer.id = item.id;
                answer.answer = correctedOpts;
                //按照原来的顺序插入元素
                answerList.splice(index, 0, answer);
            }
            failureList = Object.values(failureMap);
        }

        //模拟点击数据
        let {sameNum, clickX, clickY} = mockHumanBehaviors(totalSubject);
        //构建交卷body
        let result = {
            recordId,
            roundOnlyId,
            orderId,
            subjectInfoList: answerList,
            sameNum,
            clickX,
            clickY
        };

        let answer = readlineSync.question('答题完成,是否交卷? (Y/N)').trim().toUpperCase();
        if (answer === 'Y') {
            let delay = readlineSync.question('请输入交卷延时(建议大于15秒):').trim().toUpperCase();
            while (!delay.match(/^[\d]+$/g) || delay < 15) {
                delay = readlineSync.question('格式错误,请重新输入:').trim().toUpperCase();
            }
            delay = Math.floor(delay);
            //倒计时
            let intervalId = setInterval(() => {
                log.d(`${delay--}秒后交卷...`);
                if (delay <= 0) {
                    clearInterval(intervalId);
                    resolve(result)
                }
            }, 1000);
        } else if (answer === 'N') {
            log.d('暂不交卷...');
        } else {
            reject('输入错误, 暂不交卷...');
        }
    });
}

/**
 * 查询剩余答题次数
 * @param userType
 * @returns {Promise<any>}
 */
function getLeftChance(userType, headers) {
    log.d(JSON.stringify(headers));
    let q = {userType};
    if (userType === 0) q.orgId = 0;
    return new Promise((resolve, reject) => {
        request
            .get(`${baseUrl}/quiz-api/game_info/user_left_chance`)
            .query(q)
            .set(headers)
            .then(res => {
                let {code, msg, success, data} = res.body;
                if (code === 200 && success) {
                    resolve(data);
                } else {
                    reject(`getLeftChance: ${code} ${msg}`);
                }
            })
            .catch(err => log.e(err));
    });
}

/**
 * 查询排名和个人答题情况
 * @param headers
 * @returns {Promise<any>}
 */
function getRankList(headers) {
    log.d(JSON.stringify(headers));
    return new Promise((resolve, reject) => {
        request
            .get(`${baseUrl}/quiz-api/personal_rank/weblist?page=0&gameRoundId=`)
            .set(headers)
            .then(res => {
                let {code, msg, success, data} = res.body;
                if (code === 200 && success) {
                    resolve(data);
                } else {
                    reject(`getRankList: ${code} ${msg}`)
                }
            });

    });
}

/**
 * 获取正式的考试题目
 * POST http://xxjs.dtdjzx.gov.cn/quiz-api/game_info/getGameSubject
 * header(登录校验)
 * user_hash:若群众则为手机号;若党员则
 * system-type:web
 * @returns {Promise<any>}
 */
function getSubjectInfoList() {
    return new Promise((resolve, reject) => {
        log.d(JSON.stringify(mockHeaders));
        request
            .post(`${baseUrl}/quiz-api/game_info/getGameSubject`)
            .set(mockHeaders)
            .then(res => {
                let {code, msg, success, data} = res.body;
                if (code === 200 && success) {
                    //缓存试题
                    if (debug) {
                        let jString = JSON.stringify(data);
                        fs.writeFile(`train_data/subjectInfoList-${dateFormat('yyyyMMdd_HH-mm-ss')}.json`, jString, (err) => {
                            if (err) {
                                log.e(err);
                            } else {
                                log.d('试题缓存ok.');
                            }
                        });
                    }

                    log.d(`开始答题, 共计${data.totalSubject}题.\n`);
                    resolve(data);
                } else {
                    reject(`getSubjectInfoList: ${code} Error ${msg}`);
                }
            })
            .catch(err => log.e(err));
    });
}

/**
 * 交卷
 * POST http://xxjs.dtdjzx.gov.cn/quiz-api/chapter_info/countScore
 *
 * 机器人校验
 * 1. 记录点击[下一题按钮]的坐标
 * 2. 记录重复X坐标的次数
 *
 * @param {答题数据} result
 */
function submit(result) {
    return new Promise((resolve, reject) => {
        log.d(JSON.stringify(mockHeaders));
        log.d(JSON.stringify(result));
        request
            .post(`${baseUrl}/quiz-api/chapter_info/countScore`)
            .set(mockHeaders)
            .send(result)
            .then(res => {
                let {code, msg, success, data} = res.body;
                if (code === 200 && success) {
                    log.d(`交卷成功! ${JSON.stringify(data)}`);

                    let {recordId, useTime, totalScore, totalRight, totalWrong, overPercen} = data;
                    let w_tt = useTime.split(':');
                    if (w_tt[0] !== '00') {
                        useTime = w_tt[0] + "小时" + w_tt[1] + "分" + w_tt[2] + "秒";
                    } else if (w_tt[1] !== '00') {
                        useTime = w_tt[1] + "分" + w_tt[2] + "秒";
                    } else {
                        useTime = w_tt[2] + "秒";
                    }
                    log.d(`总分:${totalScore}, 用时${useTime}`);
                    log.d(`正确: ${totalRight}, 错误: ${totalWrong}, 超过了${overPercen}的人`);

                    resolve(totalScore);
                } else {
                    reject(`交卷失败! ${code} Error ${msg}`);
                }
            })
            .catch(err => log.e(err));
    });
}

async function printUserInfo(userType, hassh) {
    //查询个人信息的header
    let headers = Object.assign({}, mockHeaders);
    headers['Referer'] = `http://xxjs.dtdjzx.gov.cn/index.html?h=${hassh}`;
    let userInfo = await Promise.all([getLeftChance(userType, headers), getRankList(headers)]);
    let leftChance = userInfo[0];
    let {rankList, rankme: {id, orgName, totalScore, avgScore, avgTime, myRank, participationCount}, nowTime} = userInfo[1];
    const DIVIDER = '----------------------------------------------------------------';
    log.i(DIVIDER);
    log.i(`${id}: ${orgName}.`);
    log.i(DIVIDER);
    log.i(`排名      ${myRank}`);
    log.i(`平均用时  ${avgTime}`);
    log.i(`答题次数  ${participationCount}`);
    log.i(`总得分    ${totalScore}`);
    log.i(`平均分    ${avgScore}`);
    log.i(DIVIDER);
    log.i(`[${nowTime}]`);
    log.i(DIVIDER);
    log.i(`您今天有${leftChance}次答题机会.`);
    return leftChance > 0;
}

async function main() {
    try {
        //登录
        let {usetype, hassh, session} = await login(argv.i);
        //更新请求头
        //答题用headers
        mockHeaders['user_hash'] = hassh;
        if (session)
            mockHeaders['Cookie'] = session;

        //查询个人信息
        let allow = await printUserInfo(usetype, hassh);
        if (!allow) {
            log.e('今天答题次数已达上限或者不在答题时间!');
            return;
        }

        //获取试题
        let subject = await getSubjectInfoList();

        //查询答案
        let queryResult = await queryAnswer(hassh, subject.subjectInfoList);

        //请求交卷,交卷延时
        let result = await handleResult(subject, queryResult);

        //交卷
        let score = await submit(result);

        //满分则上传更新题库
        if (score === 100 && failureList && failureList.length > 0) {
            updateFailureList(failureList);
        }

    } catch (e) {
        log.e(e);
    }
}

if (require.main === module)
    main();