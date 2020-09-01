const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");

const setup = async () => {
  return new Promise(function (resolve) {
    db.serialize(() => {
      db.run(
        "CREATE TABLE IF NOT EXISTS queues ( serverId INTEGER NOT NULL UNIQUE, gameCode TEXT, players INTEGER NOT NULL );"
      );
      db.run(
        "CREATE TABLE IF NOT EXISTS players ( queue INTEGER NOT NULL, player TEXT NOT NULL);"
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

const getQueue = async (serverId) => {
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
            console.log(res)
            resolve(res);
          }
        );
      }
    );

  })
};

const enqueue = async (serverId, playerId) => {
  db.get(
    `SELECT rowID FROM queues WHERE serverId = ${serverId};`,
    (err, row) => {
      if (err) {
        return console.log("Couldn't find queue");
      }
      db.serialize(() => {
        // db.run(`DELETE FROM players WHERE queue = ${row.rowid};`);
        console.log(`INSERT INTO players (queue, player) VALUES (${row.rowid}, ${playerId})`);
        db.run(
          `INSERT INTO players (queue, player) VALUES (${row.rowid}, ${playerId})`,
          function (err) {
            if (err) {
              return console.log(err.message);
            }
            console.log("Enqueued");
          }
        );
      });
    }
  );
};

const dequeue = async (serverId, playerId) => {
  db.get(`SELECT rowID FROM queues WHERE serverId = ${serverId};`, (err, _) => {
    if (err) {
      return console.log("Couldn't find queue");
    }
    db.serialize(() => {
      db.run(`DELETE FROM players WHERE player = ${playerId};`, (err) => {
        if (err) {
          return console.log(err.message);
        }
        console.log("Dequeue");
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
