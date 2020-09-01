const Discord = require("discord.js");
const queue = require("../controllers/among-us-queue");
const client = new Discord.Client();

async function connect() {
  client.on("ready", () => {
    queue.setup().then(() => {
      client.guilds.cache.keyArray().forEach((serverId) => {
        queue.createQueue(serverId);
      });
      console.log(`Logged in as ${client.user.tag}!`);
    });
  });

  client.on("message", (msg) => {
    if (!msg.content.startsWith(process.env.IDENTIFIER)) return;
    if (!msg.member.hasPermission("ADMINISTRATOR"))
      return console.log("User does not have admin!");

    // Remove identifier
    let command = msg.content
      .substring(process.env.IDENTIFIER.length)
      .split(" ");

    if (["createQueue", "cq"].includes(command[0])) {
      queue.createQueue(msg.guild.id, msg.author.id);
    }

    if (["queue", "q"].includes(command[0])) {
      queue.getQueue(msg.guild.id).then(async (queue) => {

        let inGame = "```";
        let i;
        for (i = 0; i < Math.min(queue.length, 10) ; i++) {
          inGame = inGame + `\n${i+1}) ${msg.guild.members.cache.get(queue[i].player).user.username}`;
        }
        inGame = inGame + "\n```";

        let nextQueue = "```";
        for (let j = 1; j <= Math.max(queue.length - 10, 0); j++, i++) {
          nextQueue = nextQueue + `\n${j}) ${queue[i].player}`;
        }
        nextQueue = nextQueue + "\n```";

        let queueMessage = new Discord.MessageEmbed()
          .setColor("#7289da")
          .setTitle("")
          .setDescription("")
          .addField(
            "Current in Game:",
            inGame
          )
          .addField(
            "Next in Queue:",
            nextQueue
          );

        msg.channel.send(queueMessage);
      });
    }

    if (["queueplayer", "qp"].includes(command[0])) {
      if (!command[1].match(/<@!(\d{18})>/)) return;

      let targetUser = msg.guild.members.cache.get(command[1].substring(3, 21));
      targetUser.roles.add([process.env.LIVE_ROLE]);

      let inviteMessage = new Discord.MessageEmbed()
        .setColor("#0099ff")
        .setTitle(`Hey Crewmate, you're up!`)
        .setDescription(
          `Hey! It's your turn to play among us! Join the voice channel [here!](https://discord.gg/auEv2eG)`
        );

      targetUser.send(inviteMessage);

      queue.enqueue(msg.guild.id, command[1].substring(3, 21));
    }

    if (["kick", "k"].includes(command[0])) {
      if (!command[1].match(/<@!(\d{18})>/)) return;

      msg.guild.members.cache
        .get(command[1].substring(3, 21))
        .roles.remove([process.env.LIVE_ROLE]);
      queue.dequeue(msg.guild.id, command[1].substring(3, 21));
    }

    if (["setCode"].includes(command[0])) {
      queue.setCode(msg.guild.id, command[1]);
    }
  });

  client.login(process.env.TOKEN);
}

module.exports = {
  connect,
};
