// Debt management commands for server operators.
// Allows viewing, setting, adding, removing and resetting player debts
// stored in server.persistentData.debts.
//
// Commands:
//   /debt get                       - View your own debt (all players)
//   /debt get <player>              - View a player's debt (OP level 2)
//   /debt reset <player>            - Reset a player's debt to 0 (OP level 2)
//   /debt set <player> <amount>     - Set a player's debt to amount (OP level 2)
//   /debt add <player> <amount>     - Add amount to a player's debt (OP level 2)
//   /debt remove <player> <amount>  - Remove amount from a player's debt (OP level 2)

console.info("[SOCIETY] debtCommand.js loaded");

ServerEvents.commandRegistry((event) => {
  const { commands: Commands, arguments: Arguments } = event;

  // --- Command registration ---
  event.register(
    Commands.literal("debt")
      // /debt get [player] — view debt (own or another player's if OP)
      .then(
        Commands.literal("get")
          .executes((c) => getDebt(c.source, null))
          .then(
            Commands.argument("player", Arguments.PLAYER.create(event))
              .requires((source) => source.hasPermission(2))
              .executes((c) =>
                getDebt(c.source, Arguments.PLAYER.getResult(c, "player"))
              )
          )
      )
      // /debt reset <player> — clear all debt
      .then(
        Commands.literal("reset")
          .requires((source) => source.hasPermission(2))
          .then(
            Commands.argument("player", Arguments.PLAYER.create(event))
              .executes((c) =>
                modifyDebt(c.source, Arguments.PLAYER.getResult(c, "player"), "reset", 0)
              )
          )
      )
      // /debt set <player> <amount> — set debt to exact value
      .then(
        Commands.literal("set")
          .requires((source) => source.hasPermission(2))
          .then(
            Commands.argument("player", Arguments.PLAYER.create(event))
              .then(
                Commands.argument("amount", Arguments.INTEGER.create(event))
                  .executes((c) =>
                    modifyDebt(
                      c.source,
                      Arguments.PLAYER.getResult(c, "player"),
                      "set",
                      Arguments.INTEGER.getResult(c, "amount")
                    )
                  )
              )
          )
      )
      // /debt add <player> <amount> — increase debt
      .then(
        Commands.literal("add")
          .requires((source) => source.hasPermission(2))
          .then(
            Commands.argument("player", Arguments.PLAYER.create(event))
              .then(
                Commands.argument("amount", Arguments.INTEGER.create(event))
                  .executes((c) =>
                    modifyDebt(
                      c.source,
                      Arguments.PLAYER.getResult(c, "player"),
                      "add",
                      Arguments.INTEGER.getResult(c, "amount")
                    )
                  )
              )
          )
      )
      // /debt remove <player> <amount> — decrease debt (clamped to 0)
      .then(
        Commands.literal("remove")
          .requires((source) => source.hasPermission(2))
          .then(
            Commands.argument("player", Arguments.PLAYER.create(event))
              .then(
                Commands.argument("amount", Arguments.INTEGER.create(event))
                  .executes((c) =>
                    modifyDebt(
                      c.source,
                      Arguments.PLAYER.getResult(c, "player"),
                      "remove",
                      Arguments.INTEGER.getResult(c, "amount")
                    )
                  )
              )
          )
      )
  );

  // Returns the current debt amount for a player UUID, or 0 if no debt entry exists
  let findDebt = (server, uuid) => {
    if (!server.persistentData.debts) return 0;
    for (let index = 0; index < server.persistentData.debts.length; index++) {
      if (String(uuid) === String(server.persistentData.debts[index].uuid)) {
        return Number(server.persistentData.debts[index].amount);
      }
    }
    return 0;
  };

  // Creates a debt entry in persistentData.debts if one doesn't exist yet.
  let ensureDebtEntry = (server, uuid) => {
    if (!server.persistentData.debts) server.persistentData.debts = [];
    for (let index = 0; index < server.persistentData.debts.length; index++) {
      if (String(uuid) === String(server.persistentData.debts[index].uuid)) return;
    }
    server.persistentData.debts.push({ uuid: uuid, amount: 0 });
  };

  // --- Command handlers ---

  let getDebt = (source, target) => {
    const server = source.server;
    if (!target) target = source.player;
    let debt = findDebt(server, target.getUuid().toString());
    if (debt > 0) {
      source.player.tell(
        Text.translatable("command.society.debt.has_debt", `${target.username}`, `${global.formatPrice(debt)}`).gold()
      );
    } else {
      source.player.tell(
        Text.translatable("command.society.debt.no_debt", `${target.username}`).green()
      );
    }
    return 1;
  };

  let modifyDebt = (source, target, action, amount) => {
    const server = source.server;
    let uuid = target.getUuid().toString();
    let currentDebt = findDebt(server, uuid);
    let newDebt;

    switch (action) {
      case "reset":
        newDebt = 0;
        break;
      case "set":
        if (amount < 0) {
          source.player.tell(Text.translatable("command.society.debt.invalid_amount_non_negative").red());
          return -1;
        }
        newDebt = amount;
        break;
      case "add":
        if (amount <= 0) {
          source.player.tell(Text.translatable("command.society.debt.invalid_amount_positive").red());
          return -1;
        }
        newDebt = currentDebt + amount;
        break;
      case "remove":
        if (amount <= 0) {
          source.player.tell(Text.translatable("command.society.debt.invalid_amount_positive").red());
          return -1;
        }
        newDebt = Math.max(0, currentDebt - amount);
        break;
    }

    ensureDebtEntry(server, uuid);
    global.setDebt(server, uuid, newDebt);

    let formattedAmount = `${global.formatPrice(amount)}`;
    let formattedNewDebt = `${global.formatPrice(newDebt)}`;
    let name = `${target.username}`;

    switch (action) {
      case "reset":
        source.player.tell(Text.translatable("command.society.debt.reset", name).green());
        break;
      case "set":
        source.player.tell(Text.translatable("command.society.debt.set", name, formattedNewDebt).green());
        break;
      case "add":
        source.player.tell(Text.translatable("command.society.debt.add", formattedAmount, name, formattedNewDebt).green());
        break;
      case "remove":
        source.player.tell(Text.translatable("command.society.debt.remove", formattedAmount, name, formattedNewDebt).green());
        break;
    }
    return 1;
  };
});
