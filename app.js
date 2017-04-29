'use strict';

let https = require('https');
let http = require('http');
let time = require('time');
let db_query = require('./db');

function setWebhook() {
    let options = {
        host: "api.telegram.org",
        path: `/bot${process.env.TELEGRAM_TOKEN}/setWebhook`,
        method: "POST",
        headers: {
            'Content-Type': "application/json"
        }
    };

    let post_data = {
        url: `https://${process.env.SELF_HOSTNAME}/${process.env.TELEGRAM_TOKEN}`,
        allowed_updates: [ "message" ]
    };

    let post_req = https.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Setting Webhook: ' + chunk);
        });
    });

// post the data
    post_data = JSON.stringify(post_data);
    console.log(JSON.stringify(options));
    console.log(post_data);
    post_req.write(post_data);
    post_req.end();
}

function serverCallback(req, res) {
    if(req.url !== `/${process.env.TELEGRAM_TOKEN}`)
        res.end(JSON.stringify({status: 'not ok', error: 'Wrong request url'}));

    let data='';

    req.on('data', (chunk) => {
        data+=chunk;
    });

    req.on('end', ()=>{
        data = JSON.parse(data);
        try {
            onMessage(data.message, (reply_data, callback)=>{
                try {
                    sendMessage(data.message.chat.id, reply_data.text);
                }catch (err){
                    callback(err);
                }
            });
            res.end(JSON.stringify({status: 'ok'}));
        }catch (err){
            res.end(JSON.stringify(
                {status: 'not ok', error: "Update does not contain message"}));
        }
    });

    req.on('err', (err)=>{
        console.log(err);
        res.end(JSON.stringify({status: 'not ok', error: err}));
    });
}

function onMessage(msg, reply){
    let text = msg.text;
    let chat_id = msg.chat.id;
    try {
        console.log("Command: "+text);
        if (text.indexOf("등록") >= 0) {
            console.log("Opt-in request");
            db_query(1, chat_id, function cb(err, exists) {
                if (err) reply({text: "오류가 발생했습니다. 다시 시도해 주시겠어요?"}, (err) => {
                    if (err) console.log(err);
                });
                else if (exists) reply({text: "이미 등록하셨습니다."}, (err) => {
                    if (err) console.log(err);
                });
                else {
                    let name = msg.from.first_name;
                    let additional_greeting = '';
                    if(name) additional_greeting = `안녕하세요, ${name}님! `;
                    reply({text: additional_greeting+"등록해주셔서 감사합니다. 앞으로 급식/간식 정보를 보내드릴게요!"}, (err) => {
                        if (err) console.log(err)
                    });
                }
            });
        } else if (text.indexOf("해지") >= 0) {
            console.log("Opt-out request");
            db_query(-1, chat_id, function cb(err, exists) {
                if (err) reply({text: "오류가 발생했습니다. 다시 시도해 주시겠어요?"}, (err) => {
                    if (err) console.log(err);
                });
                else if (exists) reply({text: "해지되었습니다. 그동안 이용해 주셔서 감사합니다."}, (err) => {
                    if (err) console.log(err);
                });
                else reply({text: "음...등록하시지 않으셨는데요?"}, (err) => {
                        if (err) console.log(err)
                    });
            });

        } else if (text === "/start"){
            reply({text: "반갑습니다! 봇의 알림을 받으시려면 등록 이라고 메시지를 보내주세요." +
            " 마음이 바뀌신다면 언제든 해지 라고 메시지를 보내 알림 서비스를 해지하실 수 있습니다."}, (err) => {
                if(err) console.log(err);
            });
        } else{
            let requestedMeal=-1;
            if(text.indexOf('아침')>=0 || text.indexOf('조식')>=0) requestedMeal = 0;
            else if(text.indexOf('점심')>=0 || text.indexOf('중식')>=0) requestedMeal = 1;
            else if(text.indexOf('저녁')>=0 || text.indexOf('석식')>=0) requestedMeal = 2;
            else if(text.indexOf('간식')>=0) requestedMeal = 4;
            else if(text.indexOf('급식')>=0 || text.indexOf('밥')>=0) requestedMeal = 3;
            if(requestedMeal>=0){
                let requestedDay = 0;
                if(text.indexOf('내일')>=0) requestedDay = 1;

                let now = new time.Date();
                now.setTimezone("Asia/Seoul");
                const yyyy=now.getFullYear();
                const mm=now.getMonth()+1;
                const dd=now.getDate();
                if(isLastDay(yyyy, mm, dd) && requestedDay===1){
                    reply({text:"한 달의 마지막 날에는 다음날 급식을 잘 몰라요ㅠㅠ"}, (err)=>{
                        if(err) console.log(err);
                    });}
                else if(requestedDay===1 && requestedMeal===4){
                    reply({text: "저는 오늘 간식만 알고 있어요...ㅠ"}, (err)=>{
                        if(err) console.log(err);
                    });
                }
                else{
                    let prefix = `${yyyy}/${mm}/${dd + requestedDay}`;
                    if(requestedMeal===4) replySnack(prefix, reply);
                    else replyMeal(prefix, requestedMeal, requestedDay, reply);
                }
            }
        }
    }catch (exception){
        replyCute(reply);
    }
}

function sendMessage(chat_id, text){
    let options = {
        host: "api.telegram.org",
        path: `/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
        method: "POST",
        headers: {
            'Content-Type': "application/json"
        }
    };

    let post_data = {
        "chat_id": chat_id,
        "text": text
    };

    let post_req = https.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Sending message: ' + chunk);
        });
    });

// post the data
    post_req.write(JSON.stringify(post_data));
    post_req.end();
}

let meals = undefined;
let snack = undefined;
let getMeals = require('./meal');
let getSnack = require('./snack');
const mealTypeStr = ['조식', '중식', '석식', '급식'];
function isLastDay(yyyy, mm, dd){
    if(yyyy%4===0 && mm===2) return dd===29;
    if(mm===2) return dd===28;
    if((mm<8 && mm%2===1) ||(mm>=8 && mm%2===0)) return dd===31;
    return dd===30;
}

function randInt(min, max){
    return Math.floor(Math.random() * (max-min) + min);
}

function replyCute(replyFunc){
    var cuteList = ['꾸?', '꾸!', '헿', '힣'];
    replyFunc({text: cuteList[randInt(0, 4)]}, (err)=>{
        if(err) console.log(err);
    });
}

function replyMeal(pre, type, day, replyFunc){
    if(meals===undefined){
        replyFunc({text: "학교 홈페이지에서 급식정보를 가져오는 중이에요! 잠시만 기다려주세요..."}, (err)=>{
            console.log(err);
        });
        getMeals((receivedMeals)=>{
            meals = receivedMeals;
            replyMeal(pre, type, day, replyFunc);
        });
    }else{
        let textToSend = pre;
        textToSend += ' '+mealTypeStr[type] + '\n';
        if(type<3){
            if(meals[day][type]===""){
                replyFunc({text: "학교 홈페이지에 급식이 업로드되지 않았어요...ㅠ"}, (err)=>{
                    if(err) console.log(err);
                });
                return;
            }
            else textToSend += meals[day][type];
        }
        else for(let i=0;i<3;i+=1){
            textToSend += `\n[${mealTypeStr[i]}]`
            if(meals[day][i]===""){
                textToSend += `\n학교 홈페이지에 업로드되지 않았어요...ㅠ`
            }
            else textToSend += meals[day][i];
        }
        replyFunc({text: textToSend}, (err)=>{
            if(err) console.log(err);
        });
    }
}

function replySnack(pre, replyFunc){
    if(snack===undefined) {
        replyFunc({text: "가온누리에서 간식정보를 가져오는 중이에요! 잠시만 기다려주세요..."}, (err)=>{
            console.log(err);
        });
        getSnack((receivedSnack) => {
            snack = receivedSnack;
            replySnack(pre, replyFunc);
        });
    }
    else if(snack===""){
        replyFunc({text: '가온누리에 간식 정보가 없어요...ㅠ'}, (err)=>{
            if(err) console.log(err);
        })
    }else replyFunc({text: pre+' 간식\n'+snack}, (err)=>{
        if(err) console.log(err);
    });
}


setWebhook();

http.createServer(serverCallback).listen(process.env.PORT || 8080);
