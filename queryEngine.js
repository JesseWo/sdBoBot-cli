'use strict';

/**
 * 
 * @param {题库} questionBank 
 * @param {试题} subjectInfoList 
 */
function query(questionBank, subjectInfoList) {
    let answerList = [];
    //遍历试题
    for (let i = 0; i < subjectInfoList.length; i++) {
        const subjectInfo = subjectInfoList[i];
        const subjectTitle = subjectInfo.subjectTitle;
        const subjectType = subjectInfo.subjectType;
        const optionInfoList = subjectInfo.optionInfoList;

        console.log(`${i + 1}.[${subjectType == '0' ? '单选' : '多选'}] ${subjectTitle}`);

        //遍历题库查询答案
        let correctOptionArr;
        //step1: 完全匹配
        for (let j = 0; j < questionBank.length; j++) {
            const answerSubjectInfo = questionBank[j];
            const answerSubjectTitle = answerSubjectInfo.subjectTitle;
            if (subjectTitle == answerSubjectTitle
                && subjectType == answerSubjectInfo.subjectType) {
                let correctAnswerOptsArr = answerSubjectInfo.optionInfoList.filter((element) => element.isRight == '1');
                correctOptionArr = optionInfoList.filter((element) => {
                    for (const correctAnswerOption of correctAnswerOptsArr) {
                        if (element.optionTitle == correctAnswerOption.optionTitle) {
                            return true;
                        }
                    }
                    return false;
                });
                break;
            }
        }
        //step2: ()截断匹配
        if (!correctOptionArr) {
            for (let j = 0; j < questionBank.length; j++) {
                const answerSubjectInfo = questionBank[j];
                const answerSubjectTitle = answerSubjectInfo.subjectTitle;

                let queryArr = subjectTitle.split('（）');
                if (queryArr.length == 2) {
                    if (answerSubjectTitle.startsWith(queryArr[0])) {
                        let tmp = answerSubjectTitle.substring(queryArr[0].length);
                        correctOptionArr = optionInfoList.filter((element) => tmp.startsWith(element.optionTitle));
                        break;
                    } else if (answerSubjectTitle.endsWith(queryArr[1])) {
                        let tmp = answerSubjectTitle.substring(0, answerSubjectTitle.length - queryArr[1].length);
                        correctOptionArr = optionInfoList.filter((element) => tmp.endsWith(element.optionTitle));
                        break;
                    }
                }
            }
        }
        let correctedOpts;
        if (correctOptionArr) {
            //查询成功
            // console.log(correctOptionArr);

            let correctedOptsArr = [];
            let correctedOptsDetailArr = [];
            for (const iterator of correctOptionArr) {
                correctedOptsArr.push(iterator.optionType);
                correctedOptsDetailArr.push(`${iterator.optionType}. ${iterator.optionTitle}`);
            }
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
            console.log(`答案:${correctedOpts}\n${correctedOptsDetails}\n`);
        } else {
            correctedOpts = subjectType == '0' ? 'A' : 'A,B,C,D';
            console.log('答案查询失败!\n');
        }
        //构建查询结果
        let answer = {};
        answer.id = subjectInfo.id;
        answer.answer = correctedOpts;
        answerList.push(answer);

    }
    return answerList;
}

module.exports = query;