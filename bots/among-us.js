const Discord = require("discord.js");
const queue = require("../controllers/among-us-queue");
const client = new Discord.Client();
const gameSize = 10;

const connect = async () => {
  client.on("ready", () => {
    client.user.setActivity("Just doing my tasks.");
    queue.setup().then(() => {
      client.guilds.cache.keyArray().forEach((serverId) => {
        queue.createQueue(serverId);
      });
      console.log(`Logged in as ${client.user.tag}!`);
    });
  });

  client.on("message", async (msg) => {
    if (!msg.content.startsWith(process.env.IDENTIFIER)) return;
    if (!msg.member.hasPermission("ADMINISTRATOR"))
      return console.log("User is not an admin!");

    // Remove identifier
    let command = msg.content
      .substring(process.env.IDENTIFIER.length)
      .toLowerCase()
      .split(" ");

    if (["createQueue", "cq", "clearQueue"].includes(command[0])) {
      await queue.createQueue(msg.guild.id, msg.author.id);
      msg.guild.roles.cache.get(process.env.LIVE_ROLE).members.map((member) => {
        member.roles.remove([process.env.LIVE_ROLE]);
      });
      showQueue(msg);
    }

    if (["queue", "q", "queueplayer", "qp"].includes(command[0])) {
      for (let i = 1; i < command.length; i++) {
        if (!command[i].match(/<@!(\d{18})>/)) return;

        console.log("queued");

        let targetUser = msg.guild.members.cache.get(
          command[i].substring(3, 21)
        );
        targetUser.roles.add([process.env.LIVE_ROLE]);

        await queue
          .enqueue(msg.guild.id, command[i].substring(3, 21))
          .then((res) => {
            console.log(res);

            if (res.isPlaying && res.position < gameSize) {
              sendJoinMessage(targetUser, res);
            }
          });
      }
      showQueue(msg);
    }

    if (["kick", "k", "eject", "voteOut"].includes(command[0])) {
      for (let i = 1; i < command.length; i++) {
        if (!command[i].match(/<@!(\d{18})>/)) return;
        msg.guild.members.cache
          .get(command[i].substring(3, 21))
          .roles.remove([process.env.LIVE_ROLE]);
        await queue
          .dequeue(msg.guild.id, command[i].substring(3, 21))
          .then((res) => {
            console.log("kicked,res=", res);
            if (res === null) return;
            if (res.isPlaying && res.position < gameSize) {
              let targetUser = msg.guild.members.cache.get(res.player);
              sendJoinMessage(targetUser, res);
            }
          });
      }
      showQueue(msg);
    }

    if (["setCode", "sc"].includes(command[0])) {
      let code = command[1];
      msg.delete();
      queue.setCode(msg.guild.id, code);

      //TODO: Send anyone in game the new code

      queue.getQueue(msg.guild.id, gameSize).then(async (queue) => {
        let inviteMessage = new Discord.MessageEmbed()
          .setColor("#0099ff")
          .setTitle(`Room code`)
          .setDescription(`Hiya! The room code for Among Us is ${code}`);
        queue.forEach((queueSlot) => {
          msg.guild.members.cache.get(queueSlot.player).send(inviteMessage);
        });
      });
    }

    if (["start", "startgame"].includes(command[0])) {
      await queue.startGame(msg.guild.id);

      queue.getQueue(msg.guild.id).then(async (queue) => {
        for (let i=0; i< queue.length; i++){
          let targetUser = msg.guild.members.cache.get(queue[i].player);
          sendJoinMessage(targetUser, queue[i]);
        }
      })

      let gameStartMessage = new Discord.MessageEmbed()
      .setColor("#7289da")
      .setTitle("Game started!")

      msg.channel.send(gameStartMessage);
    }

    if (["stop", "end", "stopgame"].includes(command[0])) {
      queue.endGame(msg.guild.id);

      let gameEndedMessage = new Discord.MessageEmbed()
      .setColor("#7289da")
      .setTitle("Game ended.")

      msg.channel.send(gameEndedMessage);
    }

  });

  client.login(process.env.TOKEN);
};

const showQueue = (msg) => {
  queue.getQueue(msg.guild.id).then(async (queue) => {
    let inGame = "```";
    let i;
    for (i = 0; i < Math.min(queue.length, gameSize); i++) {
      inGame =
        inGame +
        `\n${i + 1}) ${
          msg.guild.members.cache.get(queue[i].player).user.username
        }`;
    }
    inGame = inGame + "\n```";

    let nextQueue = "```";
    for (let j = 1; j <= Math.max(queue.length - gameSize, 0); j++, i++) {
      nextQueue =
        nextQueue +
        `\n${i + 1}) ${
          msg.guild.members.cache.get(queue[i].player).user.username
        }`;
    }
    nextQueue = nextQueue + "\n```";

    let queueMessage = new Discord.MessageEmbed()
      .setColor("#7289da")
      .setTitle("")
      .setDescription("")
      .addField("Currently in Game:", inGame)
      .addField("Next in Queue:", nextQueue);

    msg.channel.send(queueMessage);
  });
};

const sendJoinMessage = (targetUser, res) => {
  targetUser.send(
    new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle(`Hey Crewmate, you're up!`)
      .setDescription(
        `Hiya! It's your turn for Among Us. ${
          res.roomCode
            ? `The room code is: ${res.roomCode}\n`
            : "\n"
        }Join the voice call [here!](${process.env.VC_LINK})`
      )
  );
}

module.exports = {
  connect,
};
