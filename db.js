module.exports=function db(action, user_id, callback) {
    'use strict';
    let pg = require('pg');

    pg.defaults.ssl = true;
    pg.connect(process.env.DATABASE_URL, function (err, client) {
        if (err) {
            console.log('Error connecting to telegram id DB, retrying');
            console.log(err);
            return db(callback);
        }
        console.log('Connected to postgres!');
        client.query('create table if not exists telegram_id_table (key serial primary key, telegram_id int4 UNIQUE NOT NULL);', function (err, res) {
            if(err) console.log(err);
            client.query(`select telegram_id from telegram_id_table where telegram_id=${user_id};`, function (err, res) {
                    let exists=true;
                    console.log(res);
                    if(res === undefined || res.rowCount===0){
                        exists=false;
                    }
                    if(action===1 && !exists){
                        client.query(`INSERT INTO telegram_id_table (telegram_id) VALUES(${user_id});`, (err, res)=>{
                            if(err) {
                                console.log(err);
                                callback(err, undefined);
                                client.end((err)=>{
                                    if(err) console.log(err);
                                });
                            }else{
                                console.log(res);
                                callback(false, false);
                            }
                        });
                    }else if(action===-1 && exists){
                        client.query(`DELETE FROM telegram_id_table WHERE telegram_id=${user_id}`, (err, res)=>{
                            if(err) {
                                console.log(err);
                                callback(err, undefined);
                                client.end((err)=>{
                                    if(err) console.log(err);
                                });
                            }else{
                                console.log(res);
                                callback(false, true);
                            }
                        });
                    }else{
                        callback(false, exists);
                        client.end((err)=>{
                            if(err) console.log(err);
                        })
                    }
                    client.end();

                });

        });
    });

};