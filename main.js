'use strict';

const httpRequst = require('./httpRequst');
const answerQuery = require('./queryEngine');
const querystring = require('querystring');
const fs = require('fs');
const log = require('./utils/logUtils');
const dateFormat = require('./utils/dateUtils');

//控制台键盘输入读取
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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
 */
function mockHumanBehaviors() {
    //TODD


    let humanBehavior = {};
    humanBehavior.sameNum = 99;
    humanBehavior.clickX = "23,44,55,66,77,98";
    humanBehavior.clickY = "12,344,33,22,44,33";
    humanBehavior.delay = 20.12;
    return humanBehavior;
}

/**
 * 交卷
 * POST http://xxjs.dtdjzx.gov.cn/quiz-api/chapter_info/countScore
 * 
 * 机器人校验
 * 1. 记录鼠标左键所有点击的坐标
 * 2. 记录重复X坐标的次数
 * 
 * @param {答题数据} result 
 */
function submit(result) {
    let jString = JSON.stringify(result);
    const options = {
        hostname: HOST,
        port: 80,
        path: '/quiz-api/chapter_info/countScore',
        method: 'POST',
        headers: headers
    };
    httpRequst(options, jString, (data) => {
        if (data.code == 200 && data.success) {
            log.d(`交卷成功! ${data}`);

            var w_tt = data.data.useTime.split(':');
            var w_ttii;
            if (w_tt[0] !== '00') {
                w_ttii = w_tt[0] + "小时" + w_tt[1] + "分" + w_tt[2] + "秒";
            } else if (w_tt[1] !== '00') {
                w_ttii = w_tt[1] + "分" + w_tt[2] + "秒";
            } else {
                w_ttii = w_tt[2] + "秒";
            }
            w_key = data.data.recordId;

            log.d(`分数:${data.data.totalScore}, 用时${w_ttii}`);
            log.d(`正确: ${data.data.totalRight}, 错误: ${data.data.totalWrong}, overPercen: ${data.data.overPercen}`);

        } else {
            log.e(`${data.code} Error ${data.msg}`);
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
        //缓存试题
        let jString = JSON.stringify(data);
        fs.writeFile(`train_data/subjectInfoList-${dateFormat('yyyyMMdd_HH-mm-ss')}.json`, jString, (err) => {
            if (err) {
                log.e(err);
            } else {
                log.d('试题缓存ok.');
            }
        });
        if (data.code == 200 && data.success) {
            log.d(`开始答题, 共计${data.data.totalSubject}题.`);
            const subjectInfoList = data.data.subjectInfoList;
            //查询答案
            let answerList = answerQuery(questionBank, subjectInfoList);

            let result = {};
            result.recordId = data.data.recordId;
            result.roundOnlyId = data.data.roundOnlyId;
            result.orderId = data.data.orderId;
            result.subjectInfoList = answerList;
            let humanBehavior = mockHumanBehaviors();
            result.sameNum = humanBehavior.sameNum;
            result.clickX = humanBehavior.clickX;
            result.clickY = humanBehavior.clickY;

            rl.question('是否交卷? (Y/N)', (answer) => {
                if (answer.toUpperCase == 'Y') {
                    rl.question('请输入交卷延时(建议大于15秒):', (answer) => {
                        log.d(`${answer}秒后自动交卷...`);
                        rl.close();
                        // setTimeout(() => submit(result), answer * 1000);
                    });
                } else if (answer.toUpperCase == 'N') {
                    log.d('暂不交卷...');
                    rl.close();
                } else {
                    log.e('输入错误, 暂不交卷...');
                    rl.close();
                }
            });

        } else {
            log.e(`${data.code} Error ${data.msg}`);
        }
    });

}

getQuestionBank('qbqkfcn2fuihtqtnvo5t8e3mri', getSubjectInfoList);

