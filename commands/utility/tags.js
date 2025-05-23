// const { isMessageInstance } = require('@sapphire/discord.js-utilities');
const { BucketScope, ApplicationCommandRegistry } = require("@sapphire/framework");
const { Subcommand } = require("@sapphire/plugin-subcommands");
const serverSettings = require("../../tools/SettingsSchema");
const { PermissionFlagsBits } = require("discord.js");

class PingCommand extends Subcommand {
  constructor(context, options) {
    super(context, {
      ...options,
      name: "tags",
      aliases: ["t", "tag"],
      description: "Manages tags. Note that only plain text supports placeholders. Embeds do not.",
      detailedDescription: {
        usage: "tag [subcommand] <name>",
        examples: [
          "tag list",
          "tag breezip",
          "tag add sylveon I like Sylveons",
        ],
        args: [
          "subcommand: Can be list/add/remove/lock/display. Defaults to display.",
          "name: The name of the tag.",
        ],
      },
      subcommands: [
        {
          name: "list",
          chatInputRun: "chatInputList",
          messageRun: "messageList",
        },
        {
          name: "add",
          chatInputRun: "chatInputAdd",
          messageRun: "messageAdd",
          preconditions: ["tagLock", "module"],
        },
        {
          name: "remove",
          chatInputRun: "chatInputRemove",
          messageRun: "messageRemove",
          preconditions: ["tagLock"],
        },
        {
          name: "info",
          chatInputRun: "chatInputInfo",
          messageRun: "messageInfo",
        },
        {
          name: "lock",
          chatInputRun: "chatInputLock",
          messageRun: "messageLock",
          requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
        },
        {
          name: "display",
          chatInputRun: "chatInputDisplay",
          messageRun: "messageDisplay",
          default: true,
        },
      ],
      cooldownDelay: 15_000,
      cooldownLimit: 3,
      cooldownScope: BucketScope.Guild,
      requiredClientPermissions: [PermissionFlagsBits.SendMessages],
      preconditions: ["module"],
    });
  }

  /**
   * @param {ApplicationCommandRegistry} registry 
   */
  registerApplicationCommands(registry) {
    registry.idHints = ["1227016558778519622"];
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("tag")
        .setDescription("Displays tags set by the server and Phoenix.")
        .addSubcommand((command) =>
          command.setName("list").setDescription("List all tags in the server"),
        )
        .addSubcommand((command) =>
          command
            .setName("add")
            .setDescription("Adds a tag to the server")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the tag (12 char max)")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("description")
                .setDescription("The description of the tag (2048 char max)")
                .setRequired(true)
                .setMaxLength(2048),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("remove")
            .setDescription("Removes a tag from the server")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the tag")
                .setRequired(true)
                .setAutocomplete(true),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("display")
            .setDescription("Displays a tag")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("The name of the tag")
                .setRequired(true)
                .setAutocomplete(true),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("lock")
            .setDescription("Locks tag management to server managers.")
            .addBooleanOption((option) =>
              option
                .setName("enable")
                .setDescription("Enable the option?")
                .setRequired(true),
            ),
        )
        .setDMPermission(false),
    );
  }

  async chatInputLock(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const option = await interaction.options.getBoolean("locked");

    db.lockTags = option;

    db.save()
      .then(() => {
        interaction.followUp(
          `${this.container.emojis.success} ${option ? "locked tags. You now need to be a server manager to manage tags." : "unlocked tags."}`,
        );
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async chatInputAdd(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const tagName = await interaction.options.getString("name");
    const tagDesc = await interaction.options.getString("description");

    const indexes = require("../../tools/infoStuff.json");

    const tag = db.tags.find((t) => t.name == tagName);
    const btag = indexes.find((t) => t.name == tagName);

    if (tag || btag) return interaction.followUp(`${this.container.emojis.error} Tag already exists.`);
    if (tagName.length > 12) {
      return interaction.followUp(`${this.container.emojis.error} Tag name is too long.`);
    }
    if (tagDesc.length > 2048) {
      return interaction.followUp(`${this.container.emojis.error} Tag description is too long.`);
    }
    if (!(await require("../../tools/premiumCheck")(interaction.guild)) && db.tags.length > 25) {
      return interaction.followUp(
        `${this.container.emojis.error} You've maxed out on the maximum of tags you can hold in the server. Limit is 25, upgradable with plus.`,
      );
    }
    if (db.tags.length > 500) return interaction.followUp(`${this.container.emojis.error} You've maxed out on the maximum of tags you can hold in the server. Limit is 500.`)

    db.tags.push({
      name: tagName,
      description: tagDesc,
      creator: interaction.user.username,
    });

    db.save()
      .then(() => {
        interaction.followUp(
          `${this.container.emojis.success} Successfully added tag \`${tagName}\`.`,
        );
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async chatInputRemove(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();
    const tagName = await interaction.options.getString("name");

    const tag = db.tags.find((t) => t.name == tagName);

    if (!tag) return interaction.followUp(`${this.container.emojis.error} Tag does not exist.`);

    for (let i = 0; i < db.tags.length; i++) {
      if (db.tags[i].name == tagName) db.tags.splice(i, 1);
    }

    db.save()
      .then(() => {
        interaction.followUp(
          `${this.container.emojis.success} Successfully removed tag \`${tagName}\`.`,
        );
      })
      .catch((err) => {
        interaction.followUp(`${this.container.emojis.error} ${err}`);
      });
  }

  async chatInputList(interaction) {
    await interaction.deferReply();
    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const indexes = require("../../tools/infoStuff.json");

    let srvTags = db.tags;
    if (srvTags == null) {
      srvTags = [];
    }

    interaction.followUp(
      `The following indexes are available.${db.lockTags ? " Tags in this server can only be managed by a server manager." : ""}\n\n**Built-in:** ${indexes.map((i) => `\`${i.name}\``)}\n**Server tags:** ${srvTags.length > 0 ? srvTags.map((r) => `\`${r.name}\``) : "No tags created."}`,
    );
  }

  async chatInputDisplay(interaction) {
    await interaction.deferReply();
    const tagName = await interaction.options.getString("name");

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const indexes = require("../../tools/infoStuff.json");

    const tag = db.tags.find((t) => t.name == tagName);
    if (tag) {
      interaction.followUp(
        `${await require("../../tools/textParser").parse(tag.description, interaction.member)}`,
      );
    } else {
      const btag = indexes.find((t) => t.name == tagName);
      if (btag) {
        interaction.followUp(
          `${await require("../../tools/textParser").parse(btag.description, interaction.member)}`,
        );
      } else {
        interaction.followUp(`${this.container.emojis.error} Tag not found.`);
      }
    }
  }

  async chatInputInfo(interaction) {
    await interaction.deferReply();
    const tagName = await interaction.options.getString("name");

    const db = await serverSettings
      .findById(interaction.guild.id, serverSettings.upsert)
      .cacheQuery();

    const indexes = require("../../tools/infoStuff.json");

    const tag = db.tags.find((t) => t.name == tagName);
    if (tag) {
      interaction.followUp(
        `**${tag.name}** : Created by ${tag.creator}\nContent: \`\`\`${tag.description}\`\`\``,
      );
    } else {
      const btag = indexes.find((t) => t.name == tagName);
      if (btag) {
        interaction.followUp(
          `**${btag.name}** : Created by ${btag.creator} : Built-in tag\nContent: \`\`\`${btag.description}\`\`\``,
        );
      } else {
        interaction.followUp(`${this.container.emojis.error} Tag not found.`);
      }
    }
  }

  async messageLock(message, args) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const option = await args.pick("boolean");

    db.lockTags = option;

    db.save()
      .then(() => {
        message.reply(
          `${this.container.emojis.success} ${option ? "locked tags. You now need to be a server manager to manage tags." : "unlocked tags."}`,
        );
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageAdd(message, args) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const tagName = await args.pick("string");
    const tagDesc = await args.rest("string");

    const indexes = require("../../tools/infoStuff.json");

    const tag = db.tags.find((t) => t.name == tagName);
    const btag = indexes.find((t) => t.name == tagName);

    if (tag || btag) return message.reply(`${this.container.emojis.error} Tag already exists.`);
    if (tagName.length > 12) return message.reply(`${this.container.emojis.error} Tag name is too long.`);
    if (tagDesc.length > 2048) {
      return message.reply(`${this.container.emojis.error} Tag description is too long.`);
    }
    if (!(await require("../../tools/premiumCheck")(message.guild)) && db.tags.length > 25) {
      return message.reply(
        `${this.container.emojis.error} You've maxed out on the maximum of tags you can hold in the server. Limit is 25, upgradable with plus.`,
      );
    }
    if (db.tags.length > 500) return message.reply(`${this.container.emojis.error} You've maxed out on the maximum of tags you can hold in the server. Limit is 500.`)

    db.tags.push({
      name: tagName,
      description: tagDesc,
      creator: message.author.username,
    });

    db.save()
      .then(() => {
        message.reply(
          `${this.container.emojis.success} Successfully added tag \`${tagName}\`.`,
        );
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageRemove(message, args) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();
    const tagName = await args.pick("string");

    const tag = db.tags.find((t) => t.name == tagName);

    if (!tag) return message.reply(`${this.container.emojis.error} Tag does not exist.`);

    for (let i = 0; i < db.tags.length; i++) {
      if (db.tags[i].name == tagName) db.tags.splice(i, 1);
    }

    db.save()
      .then(() => {
        message.reply(
          `${this.container.emojis.success} Successfully removed tag \`${tagName}\`.`,
        );
      })
      .catch((err) => {
        message.reply(`${this.container.emojis.error} ${err}`);
      });
  }

  async messageList(message) {
    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const indexes = require("../../tools/infoStuff.json");

    let srvTags = db.tags;
    if (srvTags == null) {
      srvTags = [];
    }

    message.reply(
      `The following indexes are available.${db.lockTags ? " Tags in this server can only be managed by a server manager." : ""}\n\n**Built-in:** ${indexes.map((i) => `\`${i.name}\``)}\n**Server tags:** ${srvTags.length > 0 ? srvTags.map((r) => `\`${r.name}\``) : "No tags created."}`,
    );
  }

  async messageDisplay(message, args) {
    const tagName = await args.pick("string").catch(() => undefined);

    if (!tagName) return this.messageList(message);

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const indexes = require("../../tools/infoStuff.json");

    const tag = db.tags.find((t) => t.name == tagName);
    if (tag) {
      message.reply(
        `${await require("../../tools/textParser").parse(tag.description, message.member)}`,
      );
    } else {
      const btag = indexes.find((t) => t.name == tagName);
      if (btag) {
        message.reply(
          `${await require("../../tools/textParser").parse(btag.description, message.member)}`,
        );
      } else {
        message.reply(`${this.container.emojis.error} Tag not found.`);
      }
    }
  }

  async messageInfo(message, args) {
    const tagName = await args.pick("string");

    const db = await serverSettings
      .findById(message.guild.id, serverSettings.upsert)
      .cacheQuery();

    const indexes = require("../../tools/infoStuff.json");

    const tag = db.tags.find((t) => t.name == tagName);
    if (tag) {
      message.reply(
        `**${tag.name}** : Created by ${tag.creator}\nContent: \`\`\`${tag.description}\`\`\``,
      );
    } else {
      const btag = indexes.find((t) => t.name == tagName);
      if (btag) {
        message.reply(
          `**${btag.name}** : Created by ${btag.creator} : Built-in tag\nContent: \`\`\`${btag.description}\`\`\``,
        );
      } else {
        messsage.reply(`${this.container.emojis.error} Tag not found.`);
      }
    }
  }
}
module.exports = {
  PingCommand,
};
