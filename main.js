#!/usr/bin/env node
'use strict';
/**
 * 控制train_data输出
 */
const {debug, myUrl, baseUrl, mockHeaders, mimUsedTime: MIN_USED_TIME} = require('./config');

//解析命令行参数
let argv = require('yargs')
    .option('i', {
        alias: 'identity',
        demand: false,
        default: 'member',
        describe: '你的身份: member 或 people',
        type: 'string'
    })
    .usage('Usage: sdBobot [options]')//用法格式
    .example('sdBobot -i member', 'Your identity is party member.')
    .help('h')
    .alias('h', 'help')
    .alias('v', 'version')
    .epilog('Create by Jessewo | Copyright 2018')//出现在帮助信息的结尾
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

const DIVIDER = '----------------------------------------------------------------';

let failureList;

let startTime;

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
                let index = parseInt(key);
                let item = failureMap[key];
                const subjectTitle = item.subjectTitle;
                const subjectType = item.subjectType;
                const optionInfoList = item.optionInfoList;

                log.i(`${index + 1}.[${subjectType === '0' ? '单选' : '多选'}] ${subjectTitle}`);
                optionInfoList.forEach(opt => log.i(`${opt.optionType}.${opt.optionTitle}`));

                let inputStr = readlineSync.question('请输入答案(示例: 若单选则输入 A ;若多选则输入 ABC): ', {
                    limit: input => {
                        return (subjectType === '0' && input.match(/^[A-D]{1}$/i))
                            || (subjectType === '1' && input.match(/^[A-D]{1,4}$/i));
                    },
                    limitMessage: '输入格式错误'
                }).toUpperCase();
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

        if (readlineSync.keyInYN(`答题完成, 已耗时 ${getUsedTime()}秒, 是否交卷? `)) {
            let tips = '';
            if (getUsedTime() < MIN_USED_TIME) {
                tips = `(建议大于${20 - Math.ceil(getUsedTime())}秒)`;
            }
            let delay = readlineSync.question(`请输入交卷延时${tips}: `, {
                limit: /^[\d]+$/g,
                limitMessage: '格式错误'
            });
            delay = Math.ceil(delay + getUsedTime() >= MIN_USED_TIME ? delay : MIN_USED_TIME - getUsedTime());
            //倒计时
            let intervalId = setInterval(() => {
                log.w(`${delay--}秒后交卷...`);
                if (delay <= 0) {
                    clearInterval(intervalId);
                    resolve(result)
                }
            }, 1000);
        } else {
            reject('暂不交卷.');
        }
    });
}

function getUsedTime() {
    return (new Date().getTime() - startTime) / 1000;
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
                    startTime = new Date().getTime();
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
 * @param result
 * @returns {Promise<any>}
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
                    log.d(JSON.stringify(data));

                    let {recordId, useTime, totalScore, totalRight, totalWrong, overPercen} = data;
                    let w_tt = useTime.split(':');
                    if (w_tt[0] !== '00') {
                        useTime = w_tt[0] + "小时" + w_tt[1] + "分" + w_tt[2] + "秒";
                    } else if (w_tt[1] !== '00') {
                        useTime = w_tt[1] + "分" + w_tt[2] + "秒";
                    } else {
                        useTime = w_tt[2] + "秒";
                    }
                    log.i(DIVIDER);
                    log.i('交卷成功!');
                    log.i(DIVIDER);
                    log.i(`恭喜您! 超过了全省 ${overPercen} 的参赛者`);
                    log.i(`总分: ${totalScore}, 用时${useTime}`);
                    log.i(`正确: ${totalRight}, 错误: ${totalWrong}`);
                    log.i(DIVIDER);

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
    let {rankList, selfScore, selfRank, rankme, nowTime} = userInfo[1];
    log.i(DIVIDER);
    if (rankme) {
        let {id, orgName, totalScore, avgScore, avgTime, myRank, participationCount} = rankme;
        log.i(`${id}: ${orgName}.`);
        log.i(DIVIDER);
        log.i(`全省排名  ${myRank}`);
        log.i(`平均用时  ${avgTime}`);
        log.i(`答题次数  ${participationCount}`);
        log.i(`总得分    ${totalScore}`);
        log.i(`平均分    ${avgScore}`);
    } else {
        log.i(`${selfRank}: ${selfScore}.`);
    }
    log.i(DIVIDER);
    log.i(`[${nowTime}]`);
    log.i(DIVIDER);
    log.w(`您今天有${leftChance}次答题机会.`);
    return leftChance > 0;
}

function welcome() {
    return new Promise(resolve => {
        const TIPS = `欢迎使用灯塔在线答题机器人sdBobot. 
用机器代替人类去做简单重复性的劳动是大势所趋, 人类应该花更多的时间投入到更有价值和意义的事情中去, 比如推进个人成长,家庭幸福,事业进步.
开发此软件的目的仅是为了自用, 以及顺便学习node.js, 因此使用此软件答题造成的一切后果与开发者无关.`;
        resolve(readlineSync.keyInYN(TIPS));
    });
}

async function main() {
    try {
        let agree = await welcome();
        if (!agree) return;

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