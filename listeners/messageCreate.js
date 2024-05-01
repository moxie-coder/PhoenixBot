const { Listener } = require('@sapphire/framework');
const UserDB = require('../tools/UserDB');
const config = require('../config.json');

const afkCache = [];

class ReadyListener extends Listener {
  constructor(context, options) {
    super(context, {
      ...options,
      once: false,
      event: 'messageCreate'
    });
  }
  async run(message) {
    // Only SylveonDev can use these lines. Testing specific shit
    if (message.guild && message.content.toLowerCase() == "test welcomer please" && message.author.id == "763631377152999435") {
      message.reply(`Yes mother Abby, I will obey. <3`);
      this.container.client.emit('guildMemberAdd', message.member);
      this.container.client.emit('guildMemberRemove', message.member);
    }
    if (message.guild && message.content.toLowerCase() == "thanks phoenix" && message.author.id == "763631377152999435") {
      message.reply(`You're welcome, mother.`);
    }
    if (message.guild && message.content.toLowerCase() == "not good phoenix" && message.author.id == "763631377152999435") {
      message.reply(`Awww I'm sorry... :sob:`);
    }
    if (message.guild && message.content.toLowerCase() == "shut down phoenix" && message.author.id == "763631377152999435") {
      await message.reply(`Awww already?:( Okayyy mother`);
      process.exit(0);
    }

    if (config.userdb.global && config.userdb.afkEnabled && message.guild) {
      if (afkCache.indexOf(message.member.id) != -1) {
          const usersettings = await UserDB.findById(message.member.id, UserDB.upsert).cacheQuery();

          usersettings.afk.since = null;
          usersettings.afk.status = null;
          await usersettings.save().then(() => {
          message.reply({ content: `Welcome back ${message.member}! I have cleared you afk status.` });
          }).catch((err) => {message.reply(`Welcome back ${message.member}!\nOops! I was unable to clear your afk status though. Error: ${err}`);});

          const cacheIndex = afkCache.indexOf(message.member.id);
          afkCache.splice(cacheIndex, 1);
      }

      if (message.inGuild() && !message.author.bot && message.mentions.members.size > 0) {
          if (message.mentions.members.size == 0) return;
          const member = message.mentions.members.first();
          const usersettings = await UserDB.findById(member.id, UserDB.upsert).cacheQuery();
          if (!usersettings) return;
          if (usersettings.afk.status) {
              if (member.id != message.member.id) {
                  message.reply(`${member.user.username} is not available right now.\n\`${usersettings.afk.status}\` <t:${usersettings.afk.since}:R>`);

                  if (afkCache.indexOf(member.id) == -1) afkCache.push(member.id);
              }
              else {
                  usersettings.afk.since = null;
                  usersettings.afk.status = null;
                  await usersettings.save().then(() => {
                      message.reply({ content: `Welcome back ${message.member}! I have cleared you afk status.` });
                  }).catch((err) => {message.reply(`Welcome back ${message.member}!\nOops! I was unable to clear your afk status though. Error: ${err}`);});
              }
          }
      }
    }
  }
}
module.exports = {
  ReadyListener,
  afkCache
};