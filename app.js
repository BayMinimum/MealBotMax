'use strict';

let https = require('https');
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
    post_req.write(JSON.stringify(post_data));
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
                    sendMessage(data.chat.id, reply_data.text);
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
        if (text.indexOf("등록") >= 0) {
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

        }
    }catch (exception){
        reply({text: "꾸?"}, (err) => {
            if (err) console.log(err);
        });
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

setWebhook();

https.createServer(serverCallback(req, res)).listen(process.env.PORT || 8080);
