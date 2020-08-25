const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");

const setup = async () => {
  db.serialize(() => {
    db.run(
      "CREATE TABLE queues ( serverId INTEGER NOT NULL UNIQUE, gameCode text, players INTEGER NOT NULL );"
    );
    db.run(
      "CREATE TABLE players ( queue NUMBER NOT NULL, player NUMBER NOT NULL);"
    );
  });
};

const createQueue = async (serverId, creatorId, numPlayers = 10) => {
  db.serialize(() => {
    db.run(
      `INSERT INTO queues (serverId, players) VALUES (${serverId}, ${numPlayers});`,
      function (err) {
        if (err) {
          if (err.errno === 19) {
            // Server alreay has a queue

            db.get(
              `SELECT rowID FROM queues WHERE serverId = ${serverId};`,
              (_, row) => {
                db.serialize(() => {
                  db.run(`DELETE FROM players WHERE queue = ${row.rowid};`);

                  db.run(
                    `INSERT INTO players (queue, player) VALUES (${this.lastID}, ${creatorId})`,
                    function (err) {
                      if (err) {
                        return console.log(err.message);
                      }
                      console.log("Recreated queue");
                    }
                  );
                });
              }
            );
          }
          return console.log(err.message);
        }
        console.log(this);
        db.run(
          `INSERT INTO players (queue, player) VALUES (${this.lastID}, ${creatorId})`,
          function (err) {
            if (err) {
              return console.log(err.message);
            }
            console.log(this);
            console.log("Created new queue and enqueued player");
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
  db.get(
    `SELECT rowID FROM queues WHERE serverId = ${serverId};`,
    (err, row) => {
      if (err) {
        return console.error(err.message);
      }

      db.all(
        `SELECT rowID, * FROM players WHERE queue = ${row.rowid};`,
        (err, res) => {
            if (err) {
              return console.error(err.message);
            }
            console.log(res);

        }

      )
    }
  );
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
  db.get(
    `SELECT rowID FROM queues WHERE serverId = ${serverId};`,
    (err, _) => {
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
    }
  );
};

module.exports = {
  setup,
  createQueue,
  setCode,
  getQueue,
  enqueue,
  dequeue,
};
