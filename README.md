## 灯塔在线答题机器人
- 基于灯塔的Web版本
- 环境: node

## How to start
安装依赖库
```
npm install
```
测试
```
npm test
```
启动
```
npm start
```
 ## Project目录说明
* ./analytics 目录下有各个接口返回的json数据和官方js文件;
* ./train_data 目录下缓存每次拉取到的试题,方便后续测试;


## 其他
目前仅支持答案检索,

## TODO 
1. 模糊匹配, 提高检索成功率;
2. mock人类点击动作;
3. 解决登录问题, 实现自动提交

## 声明
此project仅为个人学习node.js所用,若用于他用,后果请自负...