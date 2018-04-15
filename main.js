'use strict';

const httpRequst = require('./httpRequst');
const answerQuery = require('./queryEngine');
const querystring = require('querystring');
const fs = require('fs');
const log = require('./utils/logUtils');
const dateFormat = require('./utils/dateUtils');
const random = require('./utils/randomUtils');

//控制台键盘输入读取
var readlineSync = require('readline-sync');

const HOST = 'xxjs.dtdjzx.gov.cn';

//构建登录信息
const loginInfo = JSON.parse(fs.readFileSync('login.json', 'utf-8'));
const headers = {
    'Content-Type': 'application/json',
    'user_hash': loginInfo.hassh,
    'system-type': 'web'
};

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
    maxArr = maxArr.sort(function (x, y) { return x - y });
    let repeatX = maxArr.length > 0 ? maxArr[maxArr.length - 1] : 0 //重复x 坐标的次数

    let humanBehavior = {};
    humanBehavior.sameNum = repeatX;
    humanBehavior.clickX = clientXArr.join(',');
    humanBehavior.clickY = clientXArrY.join(',');
    return humanBehavior;
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
    const options = {
        hostname: HOST,
        port: 80,
        path: '/quiz-api/chapter_info/countScore',
        method: 'POST',
        headers: headers
    };
    httpRequst(options, jString, (data) => {
        if (data.code == 200 && data.success) {
            log.d(`交卷成功! ${JSON.stringify(data)}`);

            var w_tt = data.data.useTime.split(':');
            var w_ttii;
            if (w_tt[0] !== '00') {
                w_ttii = w_tt[0] + "小时" + w_tt[1] + "分" + w_tt[2] + "秒";
            } else if (w_tt[1] !== '00') {
                w_ttii = w_tt[1] + "分" + w_tt[2] + "秒";
            } else {
                w_ttii = w_tt[2] + "秒";
            }
            let recordId = data.data.recordId;

            log.d(`总分:${data.data.totalScore}, 用时${w_ttii}`);
            log.d(`正确: ${data.data.totalRight}, 错误: ${data.data.totalWrong}, 超过了${data.data.overPercen}的人`);

        } else {
            log.e(`交卷失败! ${data.code} Error ${data.msg}`);
        }
    });
}

/**
 * 获取试题库(答案)
 * GET http://xxjs.dtdjzx.gov.cn/quiz-api/subject_info/list?chapterId=7j0d8qp4r2g28ogjt5hq0cbhne
 * 
 * 三月题库: 7j0d8qp4r2g28ogjt5hq0cbhne
 * 四月题库: qbqkfcn2fuihtqtnvo5t8e3mri
 */
function getQuestionBank(chapterId, next) {
    const queryParams = querystring.stringify({
        'chapterId': chapterId
    });
    const options = {
        hostname: HOST,
        port: 80,
        path: `/quiz-api/subject_info/list?${queryParams}`,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    httpRequst(options, '', (data) => {
        if (data.code == 200 && data.success) {
            log.d(`获取 [${data.data.chapterTitle}] 题库, 共计${data.data.totalSubject}题.`);
            const subjectInfoList = data.data.subjectInfoList;

            next(subjectInfoList);
        }
    })
}

/**
 * 获取正式的考试题目
 * POST http://xxjs.dtdjzx.gov.cn/quiz-api/game_info/getGameSubject
 * header(登录校验)
 * user_hash:若群众则为手机号;若党员则
 * system-type:web
 */
function getSubjectInfoList(questionBank) {
    const options = {
        hostname: HOST,
        port: 80,
        path: '/quiz-api/game_info/getGameSubject',
        method: 'POST',
        headers: headers
    };
    httpRequst(options, '', (data) => {
        if (data.code == 200 && data.success) {
            //缓存试题
            let jString = JSON.stringify(data);
            fs.writeFile(`train_data/subjectInfoList-${dateFormat('yyyyMMdd_HH-mm-ss')}.json`, jString, (err) => {
                if (err) {
                    log.e(err);
                } else {
                    log.d('试题缓存ok.');
                }
            });

            log.d(`开始答题, 共计${data.data.totalSubject}题.`);
            const subjectInfoList = data.data.subjectInfoList;
            //查询答案
            let answerList = answerQuery(questionBank, subjectInfoList);

            let result = {};
            result.recordId = data.data.recordId;
            result.roundOnlyId = data.data.roundOnlyId;
            result.orderId = data.data.orderId;
            result.subjectInfoList = answerList;
            let humanBehavior = mockHumanBehaviors(data.data.totalSubject);
            result.sameNum = humanBehavior.sameNum;
            result.clickX = humanBehavior.clickX;
            result.clickY = humanBehavior.clickY;

            let answer = readlineSync.question('是否交卷? (Y/N)').trim().toUpperCase();
            if (answer == 'Y') {
                let delay = readlineSync.question('请输入交卷延时(建议大于15秒):').trim().toUpperCase();
                log.d(`${delay}秒后自动交卷...`);
                setTimeout(() => submit(result), delay * 1000);
            } else if (answer == 'N') {
                log.d('暂不交卷...');
            } else {
                log.e('输入错误, 暂不交卷...');
            }

        } else {
            log.e(`${data.code} Error ${data.msg}`);
        }
    });

}

getQuestionBank('qbqkfcn2fuihtqtnvo5t8e3mri', getSubjectInfoList);

