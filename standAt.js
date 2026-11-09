"use strict";

// ============================================================
// STAND-AT MODULE
// Bot join/auth ke baad x,z coordinates tak chal ke wahin khada rehta hai.
// y optional hai: y null ho to sirf x,z dekha jaata hai (GoalXZ).
// Settings: settings.json -> "stand-at"
// ============================================================

const { Movements, goals } = require("mineflayer-pathfinder");

function standAt(bot, config, addLog) {
  const cfg = config["stand-at"];
  if (!cfg || cfg.enabled === false) return;

  let ended = false;
  const timers = [];
  bot.once("end", () => {
    ended = true;
    timers.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
  });

  const hasY = typeof cfg.y === "number";
  const makeGoal = () =>
    hasY
      ? new goals.GoalNear(cfg.x, cfg.y, cfg.z, cfg.radius || 2)
      : new goals.GoalXZ(cfg.x, cfg.z);

  function horizontalDist() {
    const p = bot.entity.position;
    return Math.hypot(p.x - cfg.x, p.z - cfg.z);
  }

  function go() {
    try {
      bot.pathfinder.setGoal(makeGoal());
    } catch (e) {
      addLog(`[StandAt] goto error: ${e.message}`);
    }
  }

  let tries = 0;
  const start = setInterval(() => {
    if (ended) return;
    tries++;
    if (!bot.entity || !bot.entity.position) {
      if (tries > 12) {
        clearInterval(start);
        addLog("[StandAt] Bot position nahi mili, skipping");
      }
      return;
    }
    clearInterval(start);

    const mcData = require("minecraft-data")(bot.version);
    const moves = new Movements(bot, mcData);
    moves.canDig = false;
    moves.allowSprinting = true;
    bot.pathfinder.setMovements(moves);

    addLog(
      `[StandAt] Walking to X=${cfg.x}${hasY ? " Y=" + cfg.y : ""} Z=${cfg.z}`,
    );
    go();

    // Har 20s check: agar bot door hai (push hua ya path atka) to dubara goal set karo
    const check = setInterval(() => {
      if (ended || !bot.entity) return;
      const d = horizontalDist();
      if (d > (cfg.radius || 3) + 2) go();
    }, 20000);
    timers.push(check);
  }, (cfg["delay-ms"] || 15000) / 3);
  timers.push(start);

  bot.on("goal_reached", () => {
    addLog("[StandAt] Pohonch gaya, ab yahin khada rahega");
  });
}

module.exports = standAt;
