var express = require('express');
var router  = express.Router();
var fetch   = require('node-fetch');
var btoa    = require('btoa');
var Models  = require('../utils/Model');

router.get('/', function(req, res) {
    res.redirect('/');
});

router.get('/login', async function(req, res) {
    Models.Settings.findAll().then(function (result) {
        res.redirect(
            'https://discordapp.com/api/oauth2/authorize' +
            '?client_id=' + result[0].client_id +
            '&redirect_uri=' + encodeURIComponent(result[0].client_callback) +
            `&response_type=code` +
            `&scope=guilds%20identify` +
            '&prompt=none'
        );
    })
});

router.get('/callback', async function(req, res) {
    const code = req.query.code;
  
    if(!code) throw new Error('NoCodeProvided');

    Models.Settings.findAll().then(async function (result) {
        const creds = btoa(`${result[0].client_id}:${result[0].client_secret}`);
        const response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(result[0].client_callback)}`, 
            {
            method: 'POST',
            headers: {
                Authorization: `Basic ${creds}`,
            },
        }).catch(function(err) {
			console.log(err);
		});

        const json = await response.json();
        res.cookies.set('accesstoken', json.access_token, { maxAge: 12 * 60 * 60 * 1000 });

        res.redirect('/');
    });

});

module.exports = router;