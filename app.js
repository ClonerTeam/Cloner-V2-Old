const express           = require('express');
const path              = require('path');
const chalk             = require('chalk');
const http              = require("http");
const bodyParser        = require('body-parser');
const fs                = require('fs');
const proxyChecker      = require('proxy-checker');
const { scrapeProxies } = require('./utils/scraper.js');

const app      = express();
const server   = http.createServer(app);

const Discord = require('discord.js');
const client = new Discord.Client();


exports.client = client;

server.listen(8443, async () => {
    console.log(`
        ╔═════════════════════════════════════════════╗
        ║                  By Niroxy                  ║
        ║               Cloner Tech V2                ║
        ║            Started at port 8443             ║
        ╚═════════════════════════════════════════════╝
    `);

    const config = require('./Config.json');
    const Model = require('./utils/Model');
    console.log(chalk.magenta('[CLONER] : Vérification si la table Settings est créée ...'))

    await Model.Settings.findByPk(1).then((result) => {
        console.log(chalk.magenta('[CLONER] : Vérification Terminée ...'));
		 console.log(chalk.green('[CLONER] : Prêt !!'));
        client.login(result.user_token).catch(err => {
            console.log(chalk.magenta('[CLONER] : ' + err));
        });
    });

});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(require('cookies').express(['some', 'random', 'keys']));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'cloner password cat', resave: true, saveUninitialized: true }));

let allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', "*");
  res.header('Access-Control-Allow-Headers', "*");
  next();
}
app.use(allowCrossDomain);

app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/etape', require('./routes/etape'));
app.use('/api', require('./routes/api'));

app.use(function(req, res, next) {
    res.status(404);
    res.render('error', { status: 404, error: "LOST IN SPACE ?<br>Hmm, looks like that page doesn't exist." })
});

async function checkProxies() {
    return new Promise(resolve => {
        scrapeProxies.then(fetched => {
            fs.writeFile('./proxies/proxies.txt', fetched.join("\n"), (err) => {
                if (err) throw err;
            });
        }).catch(err => {});
        resolve();
    });
}

checkProxies().then(() => {
    setInterval(() => {
        checkProxies().catch(err => {});
    }, 7200000)
})