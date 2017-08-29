// From BayMinimum/MealTweet
module.exports= function (callback) {
    'use strict';
    let cheerio = require('cheerio');
    let https = require('https');
    let time = require('time');

    let now = new time.Date();
    now.setTimezone("Asia/Seoul");
    const yyyy=now.getFullYear();
    const mm=now.getMonth()+1;
    const dd=now.getDate();

    let options = {
        host: "ksa.hs.kr",
        path: "/Home/CafeteriaMenu/72",
        rejectUnauthorized: false,
        agent: false
    };

    // get html data from school website
    let data = "";
    let request = https.request(options, function (res) {
        res.setEncoding("utf8");
        res.on('data', function (chunk) {
            data += chunk;
            console.log("received chunk");
        });
        res.on('end', function () {
            parseMeal(data);
        });
    });

    request.on('error', function () {
        console.log("Network error");
    });

    request.end();

    // pass meal as [breakfast, lunch, dinner] to callback func
    let parseMeal = function (html) {
        let meals = [];
        let $ = cheerio.load(html, {decodeEntities: false}); // option to avoid unicode hangul issue

        let meal = [];
        $(".meal").find('ul').each((i, elem) => {
            let chunk = "";
            let flag = false
            $(elem).find('li').each((j, elem) => {
                    if(flag) chunk += "\n"
                    else flag = true
                    chunk += $(elem).toString()
                        .replace("<li>", "")
                        .replace("</li>", "")
                        .replace(/ /g, "")
                        .replace(/amp;/g, "");
                }
            );
            if(chunk.charAt(chunk.length-1)==='\n') chunk=chunk.substring(0, chunk.length-1);
            meal.push(chunk);
        });
        meals.push(meal);

        function generateLookupDate(yyyy, mm, dd){
            let target = `${yyyy}-`;
            if(mm<10) target += `0${mm}-`;
            else target += `${mm}-`;
            if(dd<10) target += `0${dd}`;
            else target += `${dd}`;
            return target
        }

        let lookupDate = generateLookupDate(yyyy, mm, dd+1);
        $(".meal-con").find('tr').each((i, elem)=>{
            if($(elem).find('th').toString().indexOf(lookupDate)>=0){
                let meal = [];
                $(elem).find('li').each((j, elem) => {
                        let chunk = $(elem).toString()
                            .replace("<li>", "")
                            .replace("</li>", "")
                            .replace(/ /g, "")
                            .replace(/amp;/g, "")
                            .replace("[조식]", "")
                            .replace("[중식]", "")
                            .replace("[석식]", "")
                            .replace(/,/g, "\n");
                        try {
                            if(chunk.charAt(chunk.length-1)==='\n') chunk = chunk.substring(0, chunk.length-1);
                        }catch(exception){
                            console.log(exception);
                            console.log("Substring operation for meal chunk failed!");
                        }
                        meal.push(chunk);
                    }
                );
                meals.push(meal);
            }
        });
        while(meals.length<2) meals.push(["", "", ""]);
        callback(meals);
    };

};