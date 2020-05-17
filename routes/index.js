var express = require('express');
var router = express.Router();

var fetch = require("node-fetch");
var HttpsProxyAgent = require('https-proxy-agent')

var Model = require('../utils/Model');

var fs = require('fs');
var dateformat = require('dateformat')

async function getUserInfo(accesstoken) {
    var response = await fetch('https://discord.com/api/users/@me', {
        headers: {
            authorization: `Bearer ${accesstoken}`,
        },
    });

    return await response.json();
}

async function checkClone(access_token, callback) {
    var userInfo = await getUserInfo(access_token);

    Model.Logs.findAll({
        limit: 1,
        where: {
            userID: userInfo.id
        },
        order: [ [ 'id', 'DESC' ] ]
    }).then(function(row){

        if(row.length === 1) {

            var dateResult = row[0].date;
            var Datenow = dateformat(new Date(), "dd-mm-yyyy-H-MM-ss");

            var date = dateResult.split('-');
            var newdate = Datenow.split('-');

            if(date[0] !== newdate[0]) { return callback(null, 'Yes'); }
            if(date[1] !== newdate[1]) { return callback(null, 'Yes'); }
            if(date[2] !== newdate[2]) { return callback(null, 'Yes'); }

            if(date[0] === newdate[0]) {
                if(date[3] == newdate[3]) { return callback(null, 'No'); }
                if(date[3] == newdate[3] - 1 ) { return callback(null, 'No'); }
                if(date[3] == newdate[3] - 2 ) { return callback(null, 'No'); }
                if(date[3] == newdate[3] - 3 ) {
                    if(date[4] <= newdate[4]) {
                        if(date[5] <= newdate[5]) {
                            return callback(null, 'Yes');
                        } else {
                            return callback(null, 'No');
                        }
                    } else {
                        return callback(null, 'No');
                    }
                }
            }

            callback(null, 'Yes');

        } else {
            callback(null, 'Yes');
        }
    })
}

async function checkDiscordToken(token){
    var response = await fetch('https://discord.com/api/users/@me', {
        headers: {
            authorization: token,
        },
    });

    var body = await response.json();

    if(body.message == '401: Unauthorized'){
        return 'token is invalid';
    } else {

        var AccountIsVerified = await fetch('https://discord.com/api/v6/applications/trending/global?token=' + token);
        var VerifJson = await AccountIsVerified.json();

        if(body.verified == false) {
            if(VerifJson.message == 'You need to verify your account in order to perform this action.') {
                return 'token is banned';
            } else {
                return 'token is unverified';
            }
        } else {
            if(VerifJson.message == 'You need to verify your account in order to perform this action.') {
                return 'token is banned';
            } else {
                return 'token is verified';
            }
        }

    }

}

router.get('/', async function(req, res) {

    const Settings = await Model.Settings.findByPk(1);

    var checkToken = await checkDiscordToken(Settings.user_token);
    if(checkToken == 'token is invalid' || checkToken == 'token is banned'){
        return res.render('error', {
            status: 400,
            error: `Sorry come back later`,
        });
    } else {
        var key = req.cookies.get('accesstoken');

        if(key){
            await checkClone(key, function(err, result) {
                if(err) return console.log('Error : ' + err);
                if(result == 'No') {
                    return res.render('error', { status:'Thank !!', error: 'See you in 3 hours for a next clone.' })
                } else {
                    res.render('index', { key : req.cookies.get('accesstoken') })
                }
            });
        } else {
            res.render('index', { key : req.cookies.get('accesstoken') })
        }
    }

});

module.exports = router;
