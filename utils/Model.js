var Sequelize = require('sequelize');

var sequelize = new Sequelize('mysql://root@localhost:3306/clonertech', {
    logging: false,
});

var exports = module.exports = {};

exports.sequelize = sequelize;

/**
 * Settings
 */

const Settings = sequelize.define('settings', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    client_id: { type: Sequelize.STRING },
    client_secret: { type: Sequelize.STRING },
    client_callback: { type: Sequelize.STRING },
    user_token: { type: Sequelize.STRING },
    maintenance: { type: Sequelize.STRING, defaultValue: 'false' }
}, { timestamps: false } );

exports.Settings = Settings;

/**
 * Logs
 */

const Logs = sequelize.define('logs', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    user: { type: Sequelize.STRING },
    userId: { type: Sequelize.STRING },
    newGuildID: { type: Sequelize.STRING },
    originalGuildID: { type: Sequelize.STRING },
    date: { type: Sequelize.STRING },
}, { timestamps: false } );

exports.Logs = Logs;

/**
 * Blacklist
 */

const BlackList = sequelize.define('blacklist', {
    id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    guild: { type: Sequelize.STRING },
    guildOwner: { type: Sequelize.STRING },
    InsertBy: { type: Sequelize.STRING }
}, { timestamps: false } )

exports.BlackList = BlackList;

/**
 * Database Sync
 */

sequelize.sync();