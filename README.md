## sdBoBot 答题机器人
一键 登录(验证码OCR识别) + 更新题库 + 获取试题 + 自动答题 + 交卷

## Abstract
- 基于灯塔在线的Web版本
- 环境: node.js
- 支持平台:
    - 各Linux发行版
    - Mac OS
    - Android (需配合 [Termux](https://termux.com/) 使用)
    
> Windows因中文字符乱码问题暂不支持.

## ChangeLog
> 2018.05.11更新:
> 1. 更新2017.12-2018.05所有题库
> 2. 前后端分离, **[Server端](https://github.com/JesseWo/sdBeaconOnlineBot-server)** 主要集成功能: 登录验证码OCR | 答案检索 | 错题集

#### 附: [给普通用户的使用说明](https://www.jianshu.com/p/2f32b76b9bf4)

# 运行示例
![运行示例1](./images/sample1.png)![运行示例2](./images/sample2.png)

# How to start
## 准备
安装依赖库
```
npm install
```
配置文件

```config.json```

其中 ```myUrl``` 字段为server端url,可以自行配置; 其他字段见名知意

## 启动
```
npm start
```

## Project目录说明
* ./db/questionBank.json 是2017.12-2018.05所有题库
* ./analytics 目录下有各个接口返回的json数据和官方js文件;


## TODO 
1. 模糊匹配算法, 提高检索成功率;
2. ~~登录模块(验证码OCR自动识别)~~
3. ~~建立云端错题集, 用的次数越多准确率越高;~~
4. 解决Windows上中文字符乱码问题

## License
GPL-3.0

## 声明
此project仅为个人学习node.js所用,若用于他用,后果请自负...

## 来杯咖啡
---

冒天下之大不韪写了这么个东西, 难道不该请俺喝杯咖啡嘛 ^_^

| ![微信](./images/wxpay_me.png) | ![支付宝](./images/alipay_me.jpeg) |
| :-:   | :-: |
| 微信赞赏 | 支付宝 |
