// From BayMinimum/MealTweet
module.exports=function (callback) {
    'use strict';
    let cheerio = require('cheerio');
    let http = require('http');
    let time = require('time');

    let options = {
        host: "gaonnuri.ksain.net",
        path: "/xe/"
    };

    // get html data from school website
    let data = "";
    let request = http.request(options, function (res) {
        res.setEncoding("utf8");
        res.on('data', function (chunk) {
            data += chunk;
            console.log("received chunk");
        });
        res.on('end', function () {
            parseSnack(data);
        });
    });

    let parseSnack =function (html) {
        let $ = cheerio.load(html, {decodeEntities: false}); // option to avoid unicode hangul issue
        let now = new time.Date();
        now.setTimezone("Asia/Seoul");
        let dd=now.getDate();

        let snack;
        let date_text = $('.food').parent().parent().find('.date').html();
        let day = date_text.substring(date_text.indexOf('/')+1,date_text.indexOf((')')));
        if(day==dd) snack = $(".food").parent().next().next().next().find(".menu").html();
        else snack=$(".food").last().parent().find(".menu").html();
        if(snack.indexOf("정보")>=0 && snack.indexOf("없음")>=0) snack = "";
        try {
            if(snack.charAt(0)===' ') snack = snack.substring(1, snack.length);
        }catch(exception){
            console.log(exception);
            console.log("Substring operation for snack failed!");
        }
        console.log(snack);
        callback(snack);
    };

    request.on('error', function () {
        console.log("Network error");
    });

    request.end();

};