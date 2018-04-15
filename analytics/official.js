
localStorage.setItem('anniujia', 0);

var oUrls = localStorage.getItem('oUrls');
var user1 = JSON.parse(sessionStorage.getItem('objs'));
//console.log(user1);
// 开始时间 

if (!sessionStorage.getItem('actionTime')) {
    var actionTime = new Date().getTime();
    sessionStorage.setItem('actionTime', JSON.stringify(actionTime))
}
if (user1) {
    $.ajaxSetup({
        headers: { 'user_hash': user1.hassh, 'system-type': 'web' }
    });

} else {
    alert('你还未登陆');
    location.href = 'index.html';
}
var dats = null;
var W_num = 0;
var ww_num = 0;//  自增  只增 
var ARR = [];
var xuanze = [];

//var anniujia=0;


// 分享



// 下一题 
$(".w_btn_tab_down").click(function () {
    ww_num = $('.activess').length;
    if (ww_num > w_total) {
        ww_num = w_total;
        console.log(ww_num)
    }
    W_num++;
    //	console.log(W_num);
    //	console.log(w_total);
    if (W_num >= w_total) {
        W_num = w_total;
        $(this).addClass('W_bgcol');
    }
    if (W_num >= ww_num) {
        $(this).addClass('W_bgcol');
    }
    if (W_num >= 1) {
        $('.w_btn_tab_up').removeClass('W_bgcol');
    }


    $('.W_ti_ul li').eq(W_num).show().siblings().hide();
    $('.W_kuan li').eq(W_num).addClass('W_active').siblings().removeClass('W_active');

    var w_tt = W_num + 1;
    if (w_tt > w_total) {
        w_tt = w_total
    }
    $('.W_num_i').html(w_tt);

})

// 上一题 
$(".w_btn_tab_up").click(function () {
    ww_num--;
    if (ww_num < 0) {
        W_num = 0
    };
    W_num--;

    if (W_num < 0) {
        W_num = 0
    }
    if (W_num <= 0) {
        $('.w_btn_tab_up').addClass('W_bgcol');
    }
    $('.W_ti_ul li').eq(W_num).show().siblings().hide();
    $('.W_kuan li').eq(W_num).addClass('W_active').siblings().removeClass('W_active');
    $('.W_num_i').html(W_num + 1);
    if (W_num >= 0) {
        $('.w_btn_tab_down').removeClass('W_bgcol');
    }

})

// 列表点击 
$('.W_kuan ').on('click', 'li', function () {
    var i = $('.W_kuan li').index(this);
    localStorage.setItem('w_changeid', i)

    var anniujia = localStorage.getItem('anniujia')
    //	alert(i);
    //	alert(anniujia)
    if (i > anniujia) {
        alert('答完本题才可以答下一题哦~');
        return false;
    } else if (i < anniujia) {
        $('.w_btn_tab_down').removeClass('W_bgcol')
    }

    $('.W_ti_ul li').eq(i).show().siblings().hide();
    $(this).addClass('W_active').siblings().removeClass('W_active')
    $('.W_num_i').html(i + 1);
    W_num = i;
    //	anniujia=i;
})

//$('.W_kuan li').click(function(){
//	alert(1);
//	
//})

$('.W_ml45 label .W_col').click(function () {
    $('.W_col').removeClass('active_color');
    $(this).addClass('active_color');
})

var w_DanXuanfenshu = [];
var w_DuoXuanfenshu = [];
var w_answer; //多选答案
var w_nowJson;//单选 填入
var w_nowDuoJson = [];
var w_nowNum, w_DSzong
var w_name
// 监听  加入 选择
$('.W_ti_ul ').on('click', 'input', function (e) {
    e.stopPropagation();
    $(this).parent().parent().addClass('active_color').siblings().removeClass('active_color');
    var w_subjectType = $(this).parent().parent().attr('subjectType');// 判断 多选1    单选0
    localStorage.setItem('w_subjectType', w_subjectType)
    //  只是单选题

    w_nowNum = $(this).parent().parent().parent().index();//第几题


    if (w_nowNum == w_total - 1) {
        $('.w_btn_tab_down').addClass('W_bgcol');
    }

    //	alert(w_nowNum);
    //	alert(w_total)
    if (w_nowNum == w_total - 1) {
        $('.jiaojuanss').removeClass('W_jiaoquancol');
    }
    var w_nowVal = $(this).val();// 答案
    if (w_subjectType == 0) {
        w_nowJson = {};
        w_nowJson.w_nowName = w_nowNum;
        w_nowJson.w_nowNameVal = w_nowVal;
        w_nowJson.w_nowFenVal = w_dataScore;
        if (w_DanXuanfenshu.length <= w_nowNum) {
            w_DanXuanfenshu.push(w_nowJson);
        } else {
            w_DanXuanfenshu[w_nowNum] = w_nowJson
        }
    } else {
        w_nowNum = $(this).parent().parent().parent().index();//第几题
        w_answer = $(this).parent().parent().attr('answer');
        localStorage.setItem('w_nowNum', w_nowNum);
        localStorage.setItem('w_answer', w_answer);
    }

    $('.w_btn_tab_down').removeClass('W_bgcol');
    $('.W_kuan li').eq(w_nowNum).addClass('activess');
    localStorage.setItem('anniujia', $('.activess').length)
    //console.log()
    if (w_nowNum == w_total - 1) {
        $('.w_btn_tab_down').addClass('W_bgcol');
    }


})


// 交卷算分
var w_chuanzou = {};
var subjectInfoList = [];
var w_jjson = {};
var w_name;
var w_nowDuoJson = [];
var w_arrll = [];
var w_jihuici;
var clickTrue = true;
$('.jiaojuan').click(function () {

    clearInterval(jisiqi);



    for (var i = 0; i < w_total; i++) {

        if ($('[name="ra_' + i + '"]').attr("type") === "radio") {
            //单选
            w_jjson = {}
            w_jjson.id = $('[name="ra_' + i + '"]:checked').attr('ids')
            w_jjson.answer = $('[name="ra_' + i + '"]:checked').val()
            subjectInfoList.push(w_jjson);
        }
        else {
            //多选
            w_name = 'ra_' + i;
            $('[name="' + w_name + '"]:checked').each(function () {
                w_nowDuoJson.push($(this).val());
            });
            w_jjson = {}
            w_jjson.id = $('[name="ra_' + i + '"]:checked').attr('ids')
            w_jjson.answer = w_nowDuoJson.join(',')
            subjectInfoList.push(w_jjson);
            w_nowDuoJson = [];
        }

    }


    w_chuanzou.recordId = recordId;
    w_chuanzou.roundOnlyId = roundOnlyId;
    w_chuanzou.subjectInfoList = subjectInfoList;
    //	w_chuanzou.orderId='1';
    w_chuanzou.orderId = orderId;
    //	var clientXStr=clientXArr.join(',');
    w_chuanzou.sameNum = repeatX;
    w_chuanzou.clickX = clientXArr.join(',');
    w_chuanzou.clickY = clientXArrY.join(',');
    w_arrll = []
    for (var i = 0; i < subjectInfoList.length; i++) {
        if (subjectInfoList[i].answer.length == 0) {
            w_arrll.push(i + 1);
        }
    }


    if (w_arrll.length > 0) {
        alert('您第' + w_arrll.join(',') + '题没有答');
        w_arrll = [];
        subjectInfoList = [];
        return false;
    }
    localStorage.setItem('allData2', JSON.stringify(subjectInfoList))
    subjectInfoList = [];
    if (clickTrue == true) {
        ajax3('chapter_info/countScore', w_chuanzou);
        clickTrue = false;
        w_chuanzou = {};
        clientXArr = [];
        clientXArrY = [];
        sessionStorage.removeItem('actionTime')
    } else {
        alert('您已经提交过了')
    }




})

// 退出 
$('.w_toIndex').click(function () {
    location.href = 'index.html';
    sessionStorage.removeItem('allDatajingsai');
    sessionStorage.removeItem('actionTime')

})
//点击分享
$('#bks').click(function () {
    $('#myshouji').modal('show')
})
// post 
var needdata = null;
function ajax2(urls, obj) {
    $.ajax({
        async: false,
        type: "post",
        url: oUrls + urls,
        data: obj,
        dataType: "json",

        success: function (data) {
            $('.w_wait').hide();
            $('.w_load').show();
            dats = data;
            if (urls == 'game_info/lookBackSubject') {
                needdata = dats

            }
        }
    });

}

$('.w_huikan').click(function () {
    var w_wrongArr = [];
    var w_dataneed
    ajax2('game_info/lookBackSubject', { roundOnlyId: roundOnlyId });
    $.ajax({
        async: false,
        type: "post",
        url: oUrls + 'game_info/lookBackSubject',
        data: { roundOnlyId: roundOnlyId },
        dataType: "json",

        success: function (data) {

            w_dataneed = data

        }
    });


    var allDa = JSON.parse(localStorage.getItem('allData2'));
    //   console.log(allDa[0].answer);
    //   console.log(w_dataneed.data.dateList[0].answer);
    for (var i = 0; i < w_dataneed.data.dateList.length; i++) {
        if (w_dataneed.data.dateList[i].answer != allDa[i].answer) {
            w_wrongArr.push(i)
        }
    }



    localStorage.setItem('w_wrongArr', w_wrongArr)
    w_wrongArr = [];
    localStorage.setItem('w_allRight', JSON.stringify(dats)) //获取 的 正确答案
    window.open('kaishijingsaiHuiKan.html')
})

function ajax3(urls, obj) {
    $.ajax({
        async: false,
        type: "post",
        url: oUrls + urls,
        data: JSON.stringify(obj),
        contentType: "application/json",
        success: function (data) {
            //       console.log(data);
            if (data.code == 200) {
                $('#mydefen').modal('show')
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
                $('.fenfen').html(data.data.totalScore);
                $('.w_shijain').html(w_ttii);
                $('.W_time').html(w_ttii);
                localStorage.setItem('w_shijain', w_ttii);
                localStorage.setItem('fenfen', data.data.totalScore)

                $('.w_num_geshu').html(w_total);
                $('.w_dui').html(data.data.totalRight);
                $('.W_jibaiss').html(data.data.overPercen);
                localStorage.setItem('W_jibaiss', data.data.overPercen)
                $('.w_cuode').html(data.data.totalWrong);


                if (data.data.isFullScore == 1) {     // 等发布后 才可用
                    setTimeout('w_zhsnshi()', 1000)
                }

            } else if (data.code == 1) {
                sessionStorage.removeItem('allDatajingsai');
                alert(data.msg)
                location.href = 'index.html'
            } else {
                alert(data.msg);
                //location.href='index.html'
            }

        }
    });

}
// 显示 模态框
function w_zhsnshi() {
    $('#mychoujiang').modal('show');// 显示 抽奖

}
//  再次答题  回看
$('.oneMore ').click(function () {

    if (!sessionStorage.getItem('actionTime')) {
        var actionTime = new Date().getTime();
        sessionStorage.setItem('actionTime', JSON.stringify(actionTime))
    }
    w_jihuici = JSON.parse(sessionStorage.getItem('objs'))

    ajax1('game_info/user_left_chance', { 'orgId': w_jihuici.orgId, 'userType': w_jihuici.usetype });
    //	console.log(datd);
    w_jihuici = datd.data;

    if (w_jihuici > 0) {
        ajax2('game_info/getGameSubject');
        $('#mydefen').modal('hide')
        w_dd = dats;
        charu(w_dd);
        W_num = 0;
        clickTrue = true;
        ww_num = 0;//  自增  只增 
        w_yongtime = 0;
        //	     clientXStr=[];
        jisiqi = setInterval(jishi, 1000);
        $('.jiaojuanss').addClass('W_jiaoquancol');
        localStorage.removeItem('allData2');
    } else {
        alert('您的机会已用完');
    }


})

// 点击 抽奖 
$('.w_choujiang').click(function () {

    $.ajax({
        async: false,
        type: "post",
        url: oUrls + 'game_record/randomRed',
        data: {
            recordId: recordId
        },
        dataType: "json",
        success: function (data) {

            $('#mychoujiang').modal('hide');
            if (data.data == 0) {
                //        		alert("中奖")
                $('#myshouji').modal('show')

            } else if (data.data == 1) {
                //        		alert("没奖")
                $('#myweizhongjiang').modal('show')

            }
        }
    });
})

// 领取流量 
var w_key;
$('.w_lingqu').click(function () {
    var w_shoujihao = $('.w_shoujihao').val();
    if (!(/^[1][3-5|7-8]\d{9}$/.test(w_shoujihao))) {
        alert("请输入正确手机号");
        return false;
    }
    ajax1('game_record/save', { 'id': w_key, 'isAccept': w_shoujihao })
    //	console.log(dats);
    if (datd.code == 200) {
        alert('领取成功，本轮竞赛结束后统一发送');
        $('#myshouji').modal('hide')
    } else {
        alert(datd.msg)
    }
})

// 再接再厉
$('.w_zaijie').click(function () {
    $('#myweizhongjiang').modal('hide');

})
$('.share_img').hide();

var fenxiangurl = localStorage.getItem('fenxiangurl')
// 隐藏分享
$('.jiathis_style_32x32').hide()
// 点击分享  显示  我在“灯塔-党建在线”十九大精神学习竞赛中用时xx时（时分秒）获得xx分，来挑战我吧！
$('.W_share').click(function () {
    jc = {
        title: '灯塔-党建在线',
        url: fenxiangurl,	//我在“灯塔-党建在线”党的十九大精神学习竞赛中获得**分，超越了全省**参赛者！	
        summary: '我在“灯塔-党建在线”党的十九大精神学习竞赛中获得' + localStorage.getItem('fenfen') + '分，超越了全省' + localStorage.getItem('W_jibaiss') + '的参赛者！',
        //	    pic: "img/ic_launcher.png",
        shareImg: {
            "showType": "MARK",
        },
        evt: {
            "share": "geturl"
        }
    };
    window.jiathis_config = jc;
    $('.jiathis_style_32x32').show();
})



// 模态框 操作 点击外面 不隐藏

//$('#mydefen').modal({backdrop: 'static', keyboard: false});


//  get
var datd = null;
var sty, recordId, orderId, roundOnlyId
function ajax1(urls, obj) {
    $.ajax({
        async: false,
        type: "get",
        url: oUrls + urls,
        data: obj,
        dataType: "json",
        success: function (data) {
            datd = data;
        },
        error: function (err) {
            console.log(err)
        }
    });
}
// 获取 题目列表   
// 判读 用不用 请求 。。。
var w_dd;
if (sessionStorage.getItem('allDatajingsai')) {
    w_dd = sessionStorage.getItem('allDatajingsai');
    w_dd = JSON.parse(w_dd)

    charu(w_dd);
} else {
    ajax2('game_info/getGameSubject');
    if (dats.code != 200) {
        alert(dats.msg);
        location.href = 'index.html'
    }
    w_dd = dats;

    if (w_dd.data.subjectInfoList.length > 0) {
        sessionStorage.setItem('allDatajingsai', JSON.stringify(dats));
    }
    charu(w_dd);
}

/****中途推出的时候清下数据****/
$('.toindexxxx').click(function () {
    sessionStorage.removeItem('allDatajingsai');
    sessionStorage.removeItem('actionTime');
    location.href = "index.html"
})
/*检测浏览器回退*/

if (w_dd == null) {
    alert('没有数据');
}

//	charu(w_dd);

var w_dataScore, w_total;
var w_Html = '';
var w_ConHtml = '';
var w_xuanxiang = '';
function charu(w_dd) {
    if (w_dd.code == '200') {
        $('.w_wait').hide();
        $('.w_load').show();
        localStorage.setItem('w_allHuiKan2', JSON.stringify(w_dd));

        roundOnlyId = w_dd.data.roundOnlyId;
        recordId = w_dd.data.recordId;
        //	recordId='v98v7vffsajurqhm2skp9p90ci';
        orderId = w_dd.data.orderId;

        w_Html = '';
        w_ConHtml = '';
        w_xuanxiang = '';

        //			console.log(w_dd)
        w_total = w_dd.data.totalSubject;
        var w_data = w_dd.data.subjectInfoList;
        w_dataScore = w_dd.data.subjectScore;
        //	    	console.log(w_dataScore);

        //	    	console.log(w_data);
        for (var i = 0; i < w_total; i++) {
            if (i == 0) {
                w_Html += '<li>' + Math.floor(i + 1) + '</li>'
            } else {
                w_Html += '<li onmousedown="ClickButton(event)">' + Math.floor(i + 1) + '</li>'
            }

        }

        for (var j = 0; j < w_total; j++) {
            //	    		console.log(w_data[j].subjectType);
            if (w_data[j].subjectType == 0) {
                //单选
                // 添加选项 的 abcd
                for (var y = 0; y < w_data[j].optionInfoList.length; y++) {

                    changeToZiMu(y);// 改字母

                    w_xuanxiang += '<div class="W_ml45" subjectType=' + w_data[j].subjectType + ' ><label><input type="radio" name="ra_' + j + '" ids="' + w_data[j].id + '" value="' + w_data[j].optionInfoList[y].optionType + '" /><sapn right=' + w_data[j].optionInfoList[y].isRight + ' class="W_ml10 W_col W_pointer w_fz18">' + sty + '.' + w_data[j].optionInfoList[y].optionTitle + '</sapn></label></div>'
                }
                // 添加整体 试题  的
                w_ConHtml += '<li  >'
                    + '<h1 ><span><i class="W_num_i w_fz18">' + Math.floor(j + 1) + '</i></span>.<span class="w_colred w_fz18 w_boderti">单选题</span><span class="W_ml10 w_fz18">' + w_data[j].subjectTitle + '</span></h1>'
                    + w_xuanxiang
                    + '</li>'
                w_xuanxiang = '';

            } else {
                //多选
                for (var y = 0; y < w_data[j].optionInfoList.length; y++) {

                    changeToZiMu(y);// 改字母

                    w_xuanxiang += '<div class="W_ml45" subjectType=' + w_data[j].subjectType + ' answer=' + w_data[j].answer + ' ><label><input type="checkbox" name="ra_' + j + '" ids="' + w_data[j].id + '" value="' + w_data[j].optionInfoList[y].optionType + '" /><sapn right=' + w_data[j].optionInfoList[y].isRight + ' class="w_fz18 W_ml10 W_col W_pointer w_fz18">' + sty + '.' + w_data[j].optionInfoList[y].optionTitle + '</sapn></label></div>'
                }

                w_ConHtml += '<li id="' + w_data[j].id + '" >'
                    + '<h1 ><span><i class="W_num_i w_fz18">' + Math.floor(j + 1) + '</i></span>.<span class="w_colred w_fz18 w_boderti">多选题</span><span class="W_ml10 w_fz18">' + w_data[j].subjectTitle + '</span></h1>'
                    + w_xuanxiang
                    + '</li>'
                w_xuanxiang = '';


            }

        }
        console.log('*************')

        // 123 导航。。
        $('.w_addhtml').html(w_Html);
        $('.w_charu').html(w_ConHtml);
    } else {
        console.log(w_dd.mag)
    }
}
var w_yongtime = 0;
var jisiqi = setInterval(jishi, 1000)

// 打开哦  回看错题

// 计时器
function jishi() {
    w_yongtime = Math.floor((new Date().getTime() - sessionStorage.getItem('actionTime')) / 1000)
    //	w_yongtime++;
    if (w_yongtime < 60) {
        $('.W_time').html(w_yongtime + '秒');
    } else {
        var w_fen = Math.floor(w_yongtime / 60);
        var w_miao = Math.floor(w_yongtime % 60);
        $('.W_time').html(w_fen + '分' + w_miao + '秒');
    }

}


// 封装  字符 转 字母
function changeToZiMu(y) {
    switch (y + "y") {
        case '0y': sty = 'A'
            break;
        case '1y': sty = 'B'
            break;
        case '2y': sty = 'C'
            break;
        case '3y': sty = 'D'
            break;
        case '4y': sty = 'E'
            break;
        case '5y': sty = 'F'
            break;
        case '6y': sty = 'J'
            break;
        case '7y': sty = 'H'
            break;
        case '8y': sty = 'I'
            break;
        case '9y': sty = 'G'
            break;
        case '10y': sty = 'K'
            break;
        case '11y': sty = 'L'
            break;
        case '12y': sty = 'M'
            break;
        case '13y': sty = 'N'
            break;
        case '14y': sty = 'O'
            break;
        case '15y': sty = 'P'
            break;
    }
}
//判断鼠标左键点击多少次
//ClickButton(event)
var ClickButtons = 0;
var clientXArr = [];
var clientXArrY = [];
var chongfuX = [];
var obj = {}, arr = clientXArr, maxArr = [], repeatX = 0;
function ClickButton(e) {
    var e = e || event;
    var btnNum = e.button;
    clientXArr.push(e.clientX);
    clientXArrY.push(e.clientY);
    if (clientXArr.length >= w_total - 1) {


        for (var i = 0, len = arr.length; i < len; i++) {
            if (obj[arr[i]]) {
                obj[arr[i]]++
                maxArr.push(obj[arr[i]]);
            }
            else {
                obj[arr[i]] = 1
            }
        }
        maxArr = maxArr.sort(function (x, y) { return x - y });
        repeatX = maxArr.length > 0 ? maxArr[maxArr.length - 1] : 0 //重复x 坐标的次数
        //	console.log(obj);
        //	console.log(maxArr);
        //	console.log(repeatX);
        //	console.log( clientXArr )
        //	console.log( clientXArrY )
        //	xyObj.x=clientXArr.join(',')
        //	xyObj.y=clientXArrY.join(',')
        //	console.log(xyObj)
    }

}
// 禁止浏览器 回退
history.pushState(null, null, document.URL);
window.addEventListener('popstate', function () {
    //      	console.log('回退检测。。。。')
    history.pushState(null, null, document.URL);
});