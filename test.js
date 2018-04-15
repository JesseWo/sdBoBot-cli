'use strict';

const TAG = 'test';
var fs = require('fs');
var query = require('./queryEngine');
var log = require('./utils/logUtils');

let questionBank = JSON.parse(fs.readFileSync('analytics/questionBank.json', 'utf-8'));
let subjectInfo = JSON.parse(fs.readFileSync('analytics/subjectInfoList.json', 'utf-8'));
let answerList = query(questionBank.data.subjectInfoList, subjectInfo.data.subjectInfoList);

log(TAG, answerList);

