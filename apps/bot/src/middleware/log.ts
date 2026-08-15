import type { MiddlewareModule } from "../kit/types";

export const before: MiddlewareModule["before"] = (ctx) => {
  const user = ctx.interaction.user;
  console.log(
    `[cmd] /${ctx.interaction.commandName} by ${user.tag} (${user.id})`,
  );
};
