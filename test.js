'use strict';

var fs = require('fs');
var query = require('./queryEngine');
var log = require('./utils/logUtils');

const trainDataPath = 'train_data/subjectInfoList-20180415_18-36-28.json';
// const trainDataPath = 'train_data/failureList.json';
// const trainDataPath = 'analytics/subjectInfoList.json';

let questionBank = JSON.parse(fs.readFileSync('analytics/questionBank.json', 'utf-8'));
let subjectInfo = JSON.parse(fs.readFileSync(trainDataPath, 'utf-8'));
let answerList = query(questionBank.data.subjectInfoList, subjectInfo.data.subjectInfoList);
log.d(JSON.stringify(answerList));



