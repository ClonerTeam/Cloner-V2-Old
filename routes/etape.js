var express = require('express');
var router = express.Router();

var fetch = require("node-fetch");
var HttpsProxyAgent = require('https-proxy-agent')

var Model = require('../utils/Model');

var Discord = require('discord.js');
var { client } = require('../app');

var Cleaner = require('../objects/cleaner.js')
var Serializer = require('../objects/serializer.js')
var Creator = require('../objects/creator.js')

var fs = require('fs');
var dateformat = require('dateformat')

var proxies = [];

// Guilds
async function getGuildInfo(invite, proxy) {
    var response = await fetch(`https://discord.com/api/invite/${invite}`, {
        method: 'GET',
        agent: new HttpsProxyAgent('http://' + proxy)
    });

    return await response.json();
}

async function Join(invite, token, proxy) {

    var response = await fetch(`https://discord.com/api/invite/${invite}`, {
        method: 'POST',
        headers: {
        authorization: token,
        },
        agent: new HttpsProxyAgent('http://' + proxy)
    });

    return await response.json();
}

async function Leave(guild, token, proxy) {
    var response = await fetch(`https://discord.com/api/v7/users/@me/guilds/${guild}`, {
        method: 'DELETE',
        headers: {
            authorization: token,
        },
        agent: new HttpsProxyAgent('http://' + proxy)
    });
}

// Others

async function getUserInfo(accesstoken) {
    var response = await fetch('https://discord.com/api/users/@me', {
        headers: {
            authorization: `Bearer ${accesstoken}`,
        },
    });

    return await response.json();
}

// Proxies
function checkProxies() {

    proxies.length = 0;

    fs.readFile('proxies/proxies.txt', "utf8", function(err, data) {
        if(err) console.log(err);
        var lines = data.toString().split("\n");

        for(var i = 0; i < lines.length; i++) {
            var proxy = lines[i].replace('\r', '');
            if(proxy === '') {} else { proxies.push(proxy); }
        }

    })
}

function getRandomProxies() {
    return proxies[Math.floor(Math.random() * proxies.length)];
}

checkProxies();
setInterval(() => { checkProxies() }, 7200000);

router.get('/', async function(req, res) {

    var key = req.cookies.get('accesstoken');

    res.redirect('/');

});

router.use('/2', async function(req, res) {
    if(req.method == 'POST') {
        var key = req.cookies.get('accesstoken');

        if(key){
            var invitevide = req.body.invite
            if(invitevide && invitevide !== '') {

                const Settings = await Model.Settings.findByPk(1);
                var invite = invitevide.toString().replace(/https:\/\/|http:\/\/|discord\.gg\/|discord\.com\//gi, '');

                var checkIfGuildExist = getGuildInfo(invite, getRandomProxies());

                if(checkIfGuildExist.message && checkIfGuildExist.message === "Unknown Invite"){
                    res.render('error', { status: 404, error: 'Invalid or incorrect invitation code' })
                } else {
                    var data = await Join(invite, Settings.user_token, getRandomProxies());

                    var id = data.guild.id;

                    res.render('etape/deux', { id: id, client: client });
                }

            } else {
                res.redirect('/');
            }
        } else {
            res.redirect('/');
        }

    } else {
        res.render('etape/deux');
    }
});

router.use('/3', async function(req, res) {
    if(req.method == 'POST') {
        var key = req.cookies.get('accesstoken');

        if(key) {
            var idvide = req.body.idvide
            if(idvide === '' || idvide === 'undefined'){
                res.redirect('/');
            } else {
                res.render('etape/trois', { idvide: idvide});
            }
        } else {
            res.redirect('/');
        }

    } else {
        res.render('etape/trois');
    }
});

router.use('/4', async function(req, res) {
    if(req.method == 'POST') {
        var key = req.cookies.get('accesstoken');

        if(key) {
            var newGuildId = req.body.idvide
     
            var invitecopy = req.body.invite

            if(newGuildId === '' || newGuildId === 'undefined' || invitecopy === ''){
                res.redirect('/');
            } else {
                const Settings = await Model.Settings.findByPk(1);

                var invite = invitecopy.toString().replace(/https:\/\/|http:\/\/|discord\.gg\/|discord\.com\//gi, '');

                var getInfo = await getGuildInfo(invite, getRandomProxies());
                var originalGuildId = getInfo.guild.id;

                await Model.BlackList.count({
                    where: {
                        guild: originalGuildId
                    }
                }).then(async (result) => {

                    if(result === 0) {

                        var checkIfGuildExist = getGuildInfo(invite, getRandomProxies());

                        if(checkIfGuildExist.message && checkIfGuildExist.message === "Unknown Invite"){
                            res.render('error', { status: 404, error: 'Invalid or incorrect invitation code' })
                        } else {
                            await Join(invite, Settings.user_token, getRandomProxies())
                            let guildData = {
                                step: 1,
                            };

                            if (!client.guilds.get(originalGuildId)) {
                                throw new Error('La guilde originale à copier n\'existe pas. S\'il vous plaît vérifier que l\'id dans les ' +
                                    'paramètres soit correct et si le bot est également membre de cette guilde.');
                            }

                            let backupFile = `./guilds/${originalGuildId}.json`;
                            let banCollection = new Discord.Collection();
                            let newGuildAdminRoleId = client.guilds.get(newGuildId).roles.find(elem => elem.name.toLowerCase() === 'guildcopy').id;

                            guildData = Serializer.serializeOldGuild(client, originalGuildId, banCollection, guildData, backupFile)

                            guildData = await Cleaner.cleanNewGuild(client, newGuildId, newGuildAdminRoleId, guildData);

                            await Creator.setData(client, guildData, newGuildId, newGuildAdminRoleId);

                            var userInfo = await getUserInfo(key);

                            Model.Logs.create({
                                user: userInfo.username + '#' + userInfo.discriminator,
                                userId: userInfo.id,
                                newGuildID: newGuildId,
                                originalGuildID: originalGuildId,
                                date: dateformat(new Date(), "dd-mm-yyyy-H-MM-ss")
                            })

                            res.render('etape/quatre', { error: false });
                        }
                    } else {
                        return res.render('etape/quatre', { error: true, message: 'Ce serveur est BlackList !'});
                    }
                })

            }
        } else {
            res.redirect('/');
        }

    } else {
        res.redirect('/');
    }
});


module.exports = router;
