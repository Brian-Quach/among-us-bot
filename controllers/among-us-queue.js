const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");
// const db = new sqlite3.Database('./db/among-us.db');
const gameSize = 2;

const setup = async () => {
  return new Promise(function (resolve) {
    db.serialize(() => {
      db.run(
        "CREATE TABLE IF NOT EXISTS queues ( serverId INTEGER NOT NULL UNIQUE, gameCode TEXT, players INTEGER NOT NULL );"
      );
      db.run(
        "CREATE TABLE IF NOT EXISTS players ( queue INTEGER NOT NULL, player TEXT NOT NULL, inGame INTEGER DEFAULT 0);"
      );
      resolve();
    });
  });
};

const createQueue = async (serverId, creatorId = null, numPlayers = 10) => {
  db.serialize(() => {
    db.run(
      `INSERT INTO queues (serverId, players) VALUES (${serverId}, ${numPlayers});`,
      function (err) {
        if (err) {
          if (err.errno === 19) {
            // Server already has a queue

            db.get(
              `SELECT rowID FROM queues WHERE serverId = ${serverId};`,
              (_, row) => {
                db.serialize(() => {
                  db.run(`DELETE FROM players WHERE queue = ${row.rowid};`);
                  console.log("Recreated queue");

                  if (creatorId === null) return;
                  db.run(
                    `INSERT INTO players (queue, player) VALUES (${this.lastID}, ${creatorId})`,
                    function (err) {
                      if (err) {
                        return console.log(err.message);
                      }
                    }
                  );
                });
              }
            );
          }
          return console.log(err.message);
        }
        console.log("Created new queue");
        if (creatorId === null) return;
        db.run(
          `INSERT INTO players (queue, player) VALUES (${this.lastID}, ${creatorId})`,
          function (err) {
            if (err) {
              return console.log(err.message);
            }
            console.log("Enqueued player");
          }
        );
      }
    );
  });
};

const setCode = async (serverId, gameCode) => {
  db.run(
    `UPDATE queues SET gameCode = "${gameCode}" WHERE serverId = ${serverId};`
  );
};

const getQueue = async (serverId, num = null) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT rowID FROM queues WHERE serverId = ${serverId};`,
      (err, row) => {
        if (err) {
          reject(err.message);
        }

        db.all(
          `SELECT rowID, * FROM players WHERE queue = ${row.rowid};`,
          (err, res) => {
            if (err) {
              reject(err.message);
            }
            res = res.sort((a, b) => {
              if (a.inGame == 1 && b.inGame == 0) return -1;
              return a.rowid > b.rowid ? 1 : -1;
            });
            if (num != null) {
              res = res.slice(0, Math.min(res.length, num));
            }
            console.log(res);
            resolve(res);
          }
        );
      }
    );
  });
};

const enqueue = async (serverId, playerId) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT rowID FROM queues WHERE serverId = ${serverId};`,
      (err, row) => {
        if (err) {
          reject("Couldn't find queue");
        }
        db.all(
          `SELECT rowID, * FROM players WHERE queue = ${row.rowid} AND inGame = 1;`,
          function (err, res) {
            if (err) {
              reject(err.message);
            }
            let roomCode;
            let currNumQueued = res.length;

            db.serialize(() => {
              db.run(
                `INSERT INTO players (queue, player, inGame) VALUES (${
                  row.rowid
                }, ${playerId}, ${currNumQueued < gameSize ? 1 : 0})`,
                function (err) {
                  if (err) {
                    reject(err.message);
                  }
                  console.log("Enqueued");
                }
              );
              db.get(
                `SELECT gameCode FROM queues WHERE serverId = ${serverId};`,
                (err, queue) => {
                  if (err) {
                    reject(err.message);
                  }
                  roomCode = queue.gameCode;
                }
              );
              db.all(
                `SELECT rowID, * FROM players WHERE queue = ${row.rowid};`,
                (err, res) => {
                  if (err) {
                    reject(err.message);
                  }
                  res = res.sort((a, b) => (a.rowid > b.rowid ? 1 : -1));
                  res.forEach((player, index) => {
                    if (player.player == playerId) {
                      let res = {
                        player: playerId,
                        roomCode: roomCode,
                        position: index,
                      };
                      resolve(res);
                    }
                  });
                }
              );
            });
          }
        );
      }
    );
  });
};

const dequeue = async (serverId, playerId) => {
  console.log(`Kicking ${playerId} from queue`);
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM queues WHERE serverId = ${serverId};`, (err, res) => {
      if (err) {
        reject("Couldn't find queue");
      }
      const gameCode = res.gameCode;
      db.serialize(() => {
        db.get(
          `SELECT rowID, * FROM players WHERE player = ${playerId};`,
          (err, res) => {
            console.log("Player that we're removing:", res);
            if (err) {
              reject(err.message);
            }
            let player = res;
            let queueId = res.queue;
            let rowId = res.rowid;

            db.run(`DELETE FROM players WHERE player = ${playerId};`, (err) => {
              if (err) {
                reject(err.message);
              }
              console.log("Deleted ", playerId);

              // If player was in game, add next player to game and return their data so we can ping
              if (player.inGame) {
                console.log("player was in game, replacing them");
                console.log(
                  `SELECT rowID, * FROM players WHERE queue = ${queueId};`
                );
                db.all(
                  `SELECT rowID, * FROM players WHERE queue = ${queueId};`,
                  (err, res) => {
                    if (err) {
                      reject(err.message);
                    }

                    res = res.sort((a, b) => {
                      if (a.inGame == 1 && b.inGame == 0) return -1;
                      return a.rowid > b.rowid ? 1 : -1;
                    });
                    console.log("current queue:", res);

                    for (let i = 0; i < res.length; i++) {
                      if (res[i].inGame == 0 && i < gameSize) {
                        console.log("should be in game now:", res[i]);
                        console.log(
                          `UPDATE players set inGame = 1 WHERE player = ${res[i].player};`
                        );
                        db.run(
                          `UPDATE players set inGame = 1 WHERE player = ${res[i].player};`,
                          (err) => {
                            if (err) {
                              reject(err.message);
                            }
                            resolve({
                              player: res[i].player,
                              roomCode: gameCode,
                              position: i,
                            });
                          }
                        );
                      }
                    }
                  }
                );
              }
            });
          }
        );
      });
    });
  });
};

module.exports = {
  setup,
  createQueue,
  setCode,
  getQueue,
  enqueue,
  dequeue,
};
