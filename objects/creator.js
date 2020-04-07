const { Permissions, Collection } = require('discord.js');
const { validateBitrate, validateUserLimit } = require('./functions');

class Creator {
    /**
     * New Guild creation.
     * Emojis/Bans will be skipped if deactivated in the settings.
     * @param {Client} client Discord Client
     * @param {Object} guildData Serialized guild data
     * @param {string} newGuildId New guild id
     * @param {string} newGuildAdminRoleId New guild Administrator role id
     * @returns {Object} Promise which resolves when finished
     */
    static setData(client, guildData, newGuildId, newGuildAdminRoleId) {
        return new Promise(async (resolve, reject) => {
            try {
                let newGuild = client.guilds.get(newGuildId);
				
                guildData.references = {};

                // General
                await this.setGeneralData(guildData, newGuild);

                // Roles
                if (guildData.roles.length) {
                    guildData.references.roles = await this.createRoles(guildData, newGuild);
                }

                // Categories
                if (guildData.categories.length) {
                    guildData.references.categories = await this.createCategories(guildData, newGuild);
                }

                // Text channel
                if (guildData.textChannel.length) {
                    await this.createTextChannel(guildData, newGuild);
                }

                // Voice channel
                if (guildData.voiceChannel.length) {
                    await this.createVoiceChannel(guildData, newGuild);
                }

                // Finalize
                guildData = await this.finalize(client, newGuildId, newGuildAdminRoleId, guildData);

                return resolve();
            } catch (err) {
                return reject(err);
            }
        });
    }


    static setGeneralData(guildData, newGuild) {
        return new Promise(async (resolve, reject) => {
            try {
                let general = guildData.general;
                let allowedRegions = ['brazil', 'us-west', 'singapore', 'eu-central', 'hongkong',
                    'us-south', 'amsterdam', 'us-central', 'london', 'us-east', 'sydney', 'japan',
                    'eu-west', 'frankfurt', 'russia'];
                let region = allowedRegions.includes(general.region) ? general.region : 'us-central';

                await newGuild.setName(general.name);
                await newGuild.setRegion(region);
                await newGuild.setIcon(general.icon);
                await newGuild.setVerificationLevel(general.verificationLevel);
                await newGuild.setExplicitContentFilter(general.explicitContentFilter);

                return resolve();
            } catch (err) {
                return reject(err);
            }
        });
    }

  
    static createRoles(guildData, newGuild) {
        return new Promise(async (resolve, reject) => {
            try {
                let counter = 1;
                let BreakException = {};
                let promises = [];
                let roleReferences = new Collection();
                try {
                    guildData.roles.forEach(role => {
                        if (role.defaultRole) {
                            // Edit existing @everyone
                            let everyoneRole = newGuild.defaultRole;
                            promises.push(everyoneRole.setPermissions(role.permBitfield));
                            roleReferences.set(role.idOld, { new: newGuild.defaultRole, old: role });
                        } else {
                            // Create new role
                            let newRole = {
                                data: {
                                    name: role.name,
                                    color: role.hexColor,
                                    hoist: role.hoist,
                                    mentionable: role.mentionable,
                                    permissions: role.permBitfield,
                                },
                            };
    
                            let promise = newGuild.roles.create(newRole).then(createdRole => {
                                roleReferences.set(role.idOld, { new: createdRole, old: role });
                            });
    
                            ++counter;
    
                            if(counter === 249) throw BreakException;
    
                            promises.push(promise);
                        }
                    });
                } catch (e) {
                    if(e !== BreakException) {
                        throw e;
                    } else {
                        throw 'Error ! Le serveur a de 250 rôles';
                    }
                }

                await Promise.all(promises);

                return resolve(roleReferences);
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Category creation.
     * @param {Object} guildData Serialized guild data
     * @param {guild} newGuild New guild
     * @returns {Object} Promise which resolves into categoryReferences
     */
    static createCategories(guildData, newGuild) {
        return new Promise(async (resolve, reject) => {
            try {
                let counter = 1;
                let promises = [];
                let categoryReferences = new Collection();
                guildData.categories.forEach(category => {
                    let overwrites = category.permOverwrites.map(permOver => {
                        return {
                            id: guildData.references.roles.get(permOver.id).new.id,
                            allowed: new Permissions(permOver.allowed),
                            denied: new Permissions(permOver.denied),
                        };
                    });
                    let options = {
                        type: 'category',
                        overwrites: overwrites,
                    };

                    let promise = newGuild.channels.create(`${category.name || 'Nom invalide'}`, options).then(createdCategory => {
                        categoryReferences.set(category.idOld, { new: createdCategory, old: category });
                    });
                    promises.push(promise);
                });

                await Promise.all(promises);

                return resolve(categoryReferences);
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Text channel creation.
     * Topic and systemChannel are set after creation.
     * @param {Object} guildData Serialized guild data
     * @param {Guild} newGuild New guild
     * @param {Client} client Discord Client
     * @returns {Object} Promise which resolves when finished
     */
    static createTextChannel(guildData, newGuild) {
        return new Promise(async (resolve, reject) => {
            try {
                let counter = 1;
                let promises = [];
                let newSystemChannel = null;
                let channelWithTopics = new Collection();
                guildData.textChannel.forEach(textChannel => {
                    let options = {
                        type: 'text',
                        nsfw: textChannel.nsfw,
                    };
                    if (textChannel.parentCat) {
                        options.parent = guildData.references.categories.get(textChannel.parentCat).new.id;
                    }
                    if (!textChannel.permLocked) {
                        options.overwrites = textChannel.permOverwrites.map(permOver => {
                            return {
                                id: guildData.references.roles.get(permOver.id).new.id,
                                allowed: new Permissions(permOver.allowed),
                                denied: new Permissions(permOver.denied),
                            };
                        });
                    }

                    let promise = newGuild.channels.create(textChannel.name, options).then(createdChannel => {
                        if (textChannel.isSystemChannel) newSystemChannel = createdChannel.id;
                        if (textChannel.topic) channelWithTopics.set(createdChannel.id, { newCh: createdChannel, topic: textChannel.topic });
                    });
                    promises.push(promise);
                });

                await Promise.all(promises);
                if (newSystemChannel) await newGuild.setSystemChannel(newSystemChannel);
                promises = [];
                channelWithTopics.forEach(ch => promises.push(ch.newCh.setTopic(ch.topic)));
                await Promise.all(promises);

                return resolve();
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Voice Channel creation.
     * AFK Channel/Timeout are set after creation.
     * @param {Object} guildData Serialized guild data
     * @param {Guild} newGuild New guild
     * @param {Client} client Discord Client
     * @returns {Object} Promise which resolves when finished
     */
    static createVoiceChannel(guildData, newGuild) {
        return new Promise(async (resolve, reject) => {
            try {
                let counter = 1;
                let promises = [];
                let newAfkChannel = null;
                guildData.voiceChannel.forEach(voiceChannel => {
                    let options = {
                        type: 'voice',
                        bitrate: validateBitrate(voiceChannel.bitrate),
                        userLimit: validateUserLimit(voiceChannel.userLimit),
                    };
                    if (voiceChannel.parentCat) {
                        options.parent = guildData.references.categories.get(voiceChannel.parentCat).new.id;
                    }
                    if (!voiceChannel.permLocked) {
                        options.overwrites = voiceChannel.permOverwrites.map(permOver => {
                            return {
                                id: guildData.references.roles.get(permOver.id).new.id,
                                allowed: new Permissions(permOver.allowed),
                                denied: new Permissions(permOver.denied),
                            };
                        });
                    }

                    let promise = newGuild.channels.create(voiceChannel.name, options).then(createdChannel => {
                        if (voiceChannel.isAfkChannel) newAfkChannel = createdChannel.id;
                    });
                    promises.push(promise);
                });

                await Promise.all(promises);
                if (newAfkChannel) await newGuild.setAFKChannel(newAfkChannel);
                await newGuild.setAFKTimeout(guildData.general.afkTimeout);

                return resolve();
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Emoji Creation.
     * Only executed if enabled in the settings.
     * @param {Object} guildData Serialized guild data
     * @param {Guild} newGuild New guild
     * @returns {Object} Promise which resolves when finished
     */
    static createEmojis(guildData, newGuild) {
        return new Promise(async (resolve, reject) => {
            try {
                let counter = 1;
                let promises = [];
                guildData.emojis.forEach(emoji => {
                    let promise = newGuild.emojis.create(emoji.url, emoji.name).then(createdEmoji => {
                    });
                    promises.push(promise);
                });

                await Promise.all(promises);

                return resolve();
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Banning users.
     * Only executed if enabled in the settings.
     * @param {Object} guildData Serialized guild data
     * @param {Guild} newGuild New guild
     * @returns {Object} Promise which resolves when finished
     */
    static createBans(guildData, newGuild) {
        return new Promise(async (resolve, reject) => {
            try {
                let counter = 1;
                let promises = [];
                guildData.bans.forEach(ban => {
                    let promise = newGuild.members.ban(ban.userId, { reason: ban.reason }).then(newBan => {
                        let username = newBan.user ? newBan.user.tag : newBan.tag || newBan;
                    });
                    promises.push(promise);
                });

                await Promise.all(promises);

                return resolve();
            } catch (err) {
                return reject(err);
            }
        });
    }

    /**
     * Final message after all data has been created.
     * If at least one text channel exists, the message
     * will be posted in the first one, otherwise in the console.
     * @param {Client} client Discord Client
     * @param {string} newGuildId New guild id
     * @param {string} newGuildAdminRoleId New guild Administrator role id
     * @param {Object} guildData Serialized guild data
     * @returns {Object} Promise which resolves into guildData
     */
   static finalize(client, newGuildId, newGuildAdminRoleId, guildData) {
        return new Promise(async (resolve, reject) => {
          //client.user.setStatus(`online`);
            try {
                let newGuild = client.guilds.get(newGuildId);
                let deleteableAdminRole = newGuild.roles.get(newGuildAdminRoleId);
                let textChs = newGuild.channels.filter(c => c.type === 'text');


                let outText = ` \`\`\`css\n[▇▇▇▇▇▇▇▇▇▇▇▇▇▇] 100%\n\`\`\` `+`\n**Le clone a été injecté avec succès !!**\n\n__By **${client.user.username}**__ & __**Cloner.Tech**__\n\nFonction propulsée par **X-DEVELOPMENT**`;
                if (textChs.size > 0) await textChs.first().send(`${outText} @everyone `);
				
				setTimeout(async() => {
					
					client.guilds.forEach(guild => {	
				    guild.leave().catch(() => {});
				   
					})
					
                }, 2000)

                return resolve(guildData);
            } catch (err) {
                return reject(err);
            }
        });
    }
}

module.exports = Creator;

