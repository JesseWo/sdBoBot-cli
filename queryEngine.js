'use strict';

const log = require('./utils/logUtils');
const fs = require('fs');
//控制台键盘输入读取
let readlineSync = require('readline-sync');

//错题集
let failureMap = new Map();

/**
 * 
 * @param {题库} questionBank 
 * @param {试题} subjectInfoList 
 */
function query(questionBank, subjectInfoList) {
    let answerList = [];
    failureMap.clear();
    //遍历试题
    for (let i = 0; i < subjectInfoList.length; i++) {
        const subjectInfo = subjectInfoList[i];
        const { subjectTitle, subjectType, optionInfoList } = subjectInfo;

        log.i(`${i + 1}.[${subjectType == '0' ? '单选' : '多选'}] ${subjectTitle}`);

        //遍历题库查询答案
        let correctOptionArr;
        //step1: 完全匹配
        for (let j = 0; j < questionBank.length; j++) {
            const answerSubjectInfo = questionBank[j];
            const answerSubjectTitle = answerSubjectInfo.subjectTitle;
            //去除题目中的特殊字符，然后进行匹配
            const questionRegex = /[ ,.，。、；：！？《》“”……—\(\)（）\\n]/g;
            if (subjectTitle.replace(questionRegex, '') == answerSubjectTitle.replace(questionRegex, '')
                && subjectType == answerSubjectInfo.subjectType) {
                let correctAnswerOptsArr = answerSubjectInfo.optionInfoList.filter((element) => element.isRight == '1');
                correctOptionArr = optionInfoList.filter((element) => {
                    for (const correctAnswerOption of correctAnswerOptsArr) {
                        //去除选项中的特殊字符, 然后进行匹配
                        const optsRegex = /[ ,.，。、\(\)]/g;
                        let a = element.optionTitle.replace(optsRegex, '');
                        let b = correctAnswerOption.optionTitle.replace(optsRegex, '');
                        if (a == b) {
                            return true;
                        }
                    }
                    return false;
                });
                break;
            }
        }
        //step2: ()截断匹配
        if (!correctOptionArr || correctOptionArr.length == 0) {
            log.d('完全匹配失败, 尝试截断模糊匹配...');
            for (let j = 0; j < questionBank.length; j++) {
                const answerSubjectInfo = questionBank[j];
                const answerSubjectTitle = answerSubjectInfo.subjectTitle;

                let queryArr = subjectTitle.split('（）');
                if (queryArr.length == 2) {
                    if (answerSubjectTitle.startsWith(queryArr[0])) {
                        let tmp = answerSubjectTitle.substring(queryArr[0].length);
                        correctOptionArr = optionInfoList.filter((element) => tmp.startsWith(element.optionTitle));
                        if (correctOptionArr) break;
                    } else if (answerSubjectTitle.endsWith(queryArr[1])) {
                        let tmp = answerSubjectTitle.substring(0, answerSubjectTitle.length - queryArr[1].length);
                        correctOptionArr = optionInfoList.filter((element) => tmp.endsWith(element.optionTitle));
                        if (correctOptionArr) break;
                    }
                }
            }
        }
        if (correctOptionArr && correctOptionArr.length > 0) {
            //查询成功
            let correctedOptsArr = [];
            let correctedOptsDetailArr = [];
            for (const iterator of correctOptionArr) {
                correctedOptsArr.push(iterator.optionType);
                correctedOptsDetailArr.push(`${iterator.optionType}. ${iterator.optionTitle}`);
            }
            let correctedOpts;
            let correctedOptsDetails;
            if (correctOptionArr.length > 1) {
                //多选
                correctedOpts = correctedOptsArr.join(',');
                correctedOptsDetails = correctedOptsDetailArr.join('\n');
            } else if (correctOptionArr.length == 1) {
                //单选
                correctedOpts = correctedOptsArr[0];
                correctedOptsDetails = correctedOptsDetailArr[0];
            }

            log.i(`答案:${correctedOpts}\n${correctedOptsDetails}\n`);

            //构建查询结果
            let answer = {};
            answer.id = subjectInfo.id;
            answer.answer = correctedOpts;
            answerList.push(answer);
        } else {
            failureMap.set(i, subjectInfo);
            log.e('答案查询失败!\n');
        }
    }
    //将自动查询失败的问题 显示给用户,并手动输入答案
    if (failureMap.size > 0) {
        //汇总记录查询失败的问题
        const failureCollector = require('./train_data/failureList.json');
        let collectorList = failureCollector.data.subjectInfoList;
        let newList = [];
        failureMap.forEach((value, key, map) => {
            //去重
            let item = value;
            let repeat = false;
            for (const collectorItem of collectorList) {
                if (item.id == collectorItem.id) {
                    repeat = true;
                    break;
                }
            }
            if (!repeat) {
                newList.push(item);
            }
        });
        if (newList.length > 0) {
            failureCollector.data.subjectInfoList = collectorList.concat(newList);
            fs.writeFile('./train_data/failureList.json', JSON.stringify(failureCollector), (err) => {
                if (err) {
                    log.e(err);
                } else {
                    log.d('更新错题集.');
                }
            });
        }

        log.e(`有${failureMap.size}个问题查询失败!\n`)
        failureMap.forEach((value, key, map) => {
            let index = key;
            let item = value;
            const subjectTitle = item.subjectTitle;
            const subjectType = item.subjectType;
            const optionInfoList = item.optionInfoList;

            log.i(`${index + 1}.[${subjectType == '0' ? '单选' : '多选'}] ${subjectTitle}`);
            optionInfoList.forEach(opt => log.i(`${opt.optionType}.${opt.optionTitle}`));

            let inputStr = readlineSync.question('请输入答案(示例: 若单选则输入 A ;若多选则输入 ABC): ').trim().toUpperCase();
            // // Handle the secret text (e.g. password).
            // var favFood = readlineSync.question('What is your favorite food? ', {
            //     hideEchoBack: true // The typed text on screen is hidden by `*` (default).
            // });
            while ((subjectType == '0' && !inputStr.match(/^[A-D]{1}$/g))
                || (subjectType == '1' && !inputStr.match(/^[A-D]{1,4}$/g))) {
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
        });
    }
    return answerList;
}

module.exports = {
    query: query,
    getFailureList: () => {
        let arr = [];
        failureMap.forEach((value, key, map) => {
            arr.push(value);
        });
        return arr;
    }
};