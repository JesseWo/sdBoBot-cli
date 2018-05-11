#!/usr/bin/env node
'use strict';
/**
 * 控制train_data输出
 */
const debug = require('./package').debug;

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

const {httpGet, httpPost} = require('./httpRequst');
const queryEngine = require('./queryEngine');
const fs = require('fs');
const log = require('./utils/logUtils');
const dateFormat = require('./utils/dateUtils');
const random = require('./utils/randomUtils');
//登录模块
const login = require('./login');

//控制台键盘输入读取
const readlineSync = require('readline-sync');


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
            obj[x]++
            maxArr.push(obj[clientXArr[i]]);
        } else {
            obj[x] = 1
        }
    }
    maxArr = maxArr.sort(function (x, y) {
        return x - y
    });
    let repeatX = maxArr.length > 0 ? maxArr[maxArr.length - 1] : 0 //重复x 坐标的次数

    return {
        sameNum: repeatX,
        clickX: clientXArr.join(','),
        clickY: clientXArrY.join(',')
    };
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
    let jString = JSON.stringify(result);
    log.d(jString);
    httpPost({
        path: '/quiz-api/chapter_info/countScore',
        body: jString
    }, (statusCode, headers, data) => {
        if (data.code == 200 && data.success) {
            log.d(`交卷成功! ${JSON.stringify(data)}`);

            var w_tt = data.data.useTime.split(':');
            var useTime;
            if (w_tt[0] !== '00') {
                useTime = w_tt[0] + "小时" + w_tt[1] + "分" + w_tt[2] + "秒";
            } else if (w_tt[1] !== '00') {
                useTime = w_tt[1] + "分" + w_tt[2] + "秒";
            } else {
                useTime = w_tt[2] + "秒";
            }
            let recordId = data.data.recordId;
            let totalScore = data.data.totalScore;

            //满分则上传更新题库
            let arr = queryEngine.getFailureList();
            if (totalScore == 100 && arr.length > 0) {
                updateFailureList(arr);
            }

            log.d(`总分:${totalScore}, 用时${useTime}`);
            log.d(`正确: ${data.data.totalRight}, 错误: ${data.data.totalWrong}, 超过了${data.data.overPercen}的人`);

        } else {
            log.e(`交卷失败! ${data.code} Error ${data.msg}`);
        }
    });
}

/**
 * 更新错题集
 * @param {Iterable} failureList
 */
function updateFailureList(failureList) {
    let jString = JSON.stringify(failureList);
    httpPost({
        baseUrl: 'http://wooox.320.io:3110',
        path: '/sdbeacononline/updatefailurelist',
        body: jString
    }, (statusCode, headers, data) => {
        if (statusCode == 200) {
            log.e(`错题集更新成功!`);
        } else {
            log.e(`错题集更新失败!`);
        }
    });
}

function updateChapterId(hassh) {
    return new Promise((onSuccess, onFailure) => {
        httpGet({
            baseUrl: 'http://wooox.320.io:3110',
            path: '/sdbeacononline/getchapterid',
            query: {userId: hassh},
            headers: {
                'Content-Type': 'application/json'
            },
        }, (statusCode, headers, data) => {
            let chapterId = data.chapterId;
            if (chapterId) {
                log.d(`更新chapterId: ${chapterId}`);
                onSuccess(chapterId);
            } else {
                onFailure('更新chapterId失败!');
            }
        });
    });
}

/**
 * 获取试题库(答案)
 * GET http://xxjs.dtdjzx.gov.cn/quiz-api/subject_info/list?chapterId=7j0d8qp4r2g28ogjt5hq0cbhne
 *
 * 三月题库: 7j0d8qp4r2g28ogjt5hq0cbhne
 * 四月题库: qbqkfcn2fuihtqtnvo5t8e3mri
 */
function getQuestionBank(chapterId) {
    return new Promise((onSuccess, onFailure) => {
        httpGet({
            path: '/quiz-api/subject_info/list',
            query: {
                'chapterId': chapterId
            }
        }, (statusCode, headers, data) => {
            if (data.code == 200 && data.success) {
                if (!isQuestionBankValid(data)) {
                    log.e('题库已过期!');
                    return;
                }
                log.d(`获取 [${data.data.chapterTitle}] 题库, 共计${data.data.totalSubject}题.`);
                //缓存题库
                let jString = JSON.stringify(data);
                fs.writeFile(`db/questionBank.json`, jString, (err) => {
                    if (err) {
                        log.e(err);
                    } else {
                        log.d('题库缓存ok.');
                    }
                });

                const subjectInfoList = data.data.subjectInfoList;

                onSuccess(subjectInfoList);
            } else {
                // log.e(`${data.code} Error ${data.msg}`);
                onFailure(`getQuestionBank: ${data.code} Error ${data.msg}`);
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
 */
function getSubjectInfoList(questionBank) {
    return new Promise((onSuccess, onFailure) => {
        httpPost({
            path: '/quiz-api/game_info/getGameSubject',
        }, (statusCode, headers, data) => {
            if (data.code == 200 && data.success) {
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

                const {recordId, roundOnlyId, orderId, totalSubject, subjectInfoList} = data.data;
                log.d(`开始答题, 共计${totalSubject}题.\n`);

                //查询答案
                let answerList = queryEngine.query(questionBank, subjectInfoList);
                //模拟点击数据
                let {sameNum, clickX, clickY} = mockHumanBehaviors(totalSubject);
                //构建交卷body
                let result = {
                    recordId: recordId,
                    roundOnlyId: roundOnlyId,
                    orderId: orderId,
                    subjectInfoList: answerList,
                    sameNum: sameNum,
                    clickX: clickX,
                    clickY: clickY
                };
                onSuccess(result);
            } else {
                // log.e(`${data.code} Error ${data.msg}`);
                onFailure(`getSubjectInfoList: ${data.code} Error ${data.msg}`);
            }
        });
    });
}

function preSubmit(result) {
    return new Promise((onSuccess, onFailure) => {
        let answer = readlineSync.question('是否交卷? (Y/N)').trim().toUpperCase();
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
                    onSuccess(result)
                }
            }, 1000);
        } else if (answer === 'N') {
            log.d('暂不交卷...');
        } else {
            // log.e('输入错误, 暂不交卷...');
            onFailure('输入错误, 暂不交卷...');
        }
    });
}

function isQuestionBankValid(qbData) {
    let chapterTitle = qbData.data.chapterTitle;
    let startIndex = chapterTitle.indexOf('年') + 1;
    let endIndex = chapterTitle.indexOf('月');
    let m = parseInt(chapterTitle.substring(startIndex, endIndex));
    return new Date().getMonth() + 1 === m;
}

async function main() {
    let hassh = await login(argv.i);
    //题库有效性校验
    let qbData;
    try {
        qbData = require('./db/questionBank.json');
    } catch (error) {
        log.e(error);
    }
    if (qbData) {
        log.d('从缓存读取题库...');
        if (isQuestionBankValid(qbData)) {
            log.d('检测题库有效.');
            getSubjectInfoList(qbData.data.subjectInfoList)
                .then(preSubmit)
                .then(submit)
                .catch(errorMsg => {
                    log.e(errorMsg);
                });
            return;
        }
    }
    updateChapterId(hassh) //更新题库id
        .then(getQuestionBank) //获取题库
        .then(getSubjectInfoList) //获取试题
        .then(preSubmit) //预交卷
        .then(submit) //交卷
        .catch(errorMsg => {
            log.e(errorMsg);
        });

}

if (require.main === module)
    main();