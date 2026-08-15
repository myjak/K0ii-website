import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildTextBasedChannel,
  type TextChannel,
} from "discord.js";

import { ApiError } from "../api/errors";
import type { ChatInputHandler } from "../kit/types";
import { escapeMd } from "../lib/format";

const SUMMARY_COLOR = 0xff8f3d;

export const command = new SlashCommandBuilder()
  .setName("league")
  .setDescription("Discord leagues + PS99 tracker")
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Create a Discord league (you are owner)")
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("League name (≤32, also PS99 lookup key)")
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(32),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add a member to your Discord league")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Member to add").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a member from your Discord league")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Member to remove").setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("disband").setDescription("Disband your Discord league"),
  )
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("List Discord leagues (roster only)"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("track")
      .setDescription("Pin an external PS99 league for the website")
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("PS99 league name (can pre-register)")
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(64),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("untrack")
      .setDescription("Unpin a tracked PS99 league")
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("Pinned league name")
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(64),
      ),
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List pinned PS99 leagues + add lock"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("toggle-add")
      .setDescription("Toggle whether create/track is allowed")
      .addBooleanOption((opt) =>
        opt
          .setName("open")
          .setDescription("Force open/locked; omit to toggle")
          .setRequired(false),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName("clear")
      .setDescription("Clear all pinned PS99 tracked leagues"),
  )
  .addSubcommand((sub) =>
    sub
      .setName("clearall")
      .setDescription("Wipe all Discord leagues + summary"),
  )
  .addSubcommandGroup((group) =>
    group
      .setName("channel")
      .setDescription("League channel config")
      .addSubcommand((sub) =>
        sub
          .setName("set")
          .setDescription("Set the league channel to this channel"),
      )
      .addSubcommand((sub) =>
        sub
          .setName("view")
          .setDescription("Show configured league channel"),
      ),
  );

export const chatInput: ChatInputHandler = async (ctx) => {
  const sub = ctx.interaction.options.getSubcommand(true);
  const group = ctx.interaction.options.getSubcommandGroup(false);
  const settings = await ctx.api.leagueSettings().catch(() => null);
  const leagueChannelId =
    settings?.channelId || process.env.LEAGUE_CHANNEL_ID || null;

  // Channel gate: all cmds except channel.* must run in league channel when set.
  if (group !== "channel" && leagueChannelId) {
    if (ctx.interaction.channelId !== leagueChannelId) {
      await ctx.interaction.reply({
        content: `Use league commands in <#${leagueChannelId}>.`,
        ephemeral: true,
      });
      return;
    }
  }

  if (group === "channel") {
    if (
      !ctx.interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      await ctx.interaction.reply({
        content: "Need **Manage Server** for channel config.",
        ephemeral: true,
      });
      return;
    }
    await ctx.interaction.deferReply({ ephemeral: true });
    try {
      if (sub === "view") {
        const s = await ctx.api.leagueSettings();
        const id = s.channelId || process.env.LEAGUE_CHANNEL_ID;
        await ctx.interaction.editReply({
          content: id
            ? `League channel: <#${id}>`
            : "No league channel configured. Use `/league channel set` here.",
        });
        return;
      }
      if (sub === "set") {
        const ch = ctx.interaction.channel;
        if (!ch || ch.type !== ChannelType.GuildText) {
          await ctx.interaction.editReply({
            content: "Run this in a text channel.",
          });
          return;
        }
        await ctx.api.setLeagueChannel(ch.id);
        await refreshSummaryEmbed(ctx, ch);
        await ctx.interaction.editReply({
          content: `League channel set to <#${ch.id}>.`,
        });
        return;
      }
    } catch (err) {
      await ctx.interaction.editReply({ content: formatErr(err) });
    }
    return;
  }

  if (sub === "view") {
    await ctx.interaction.deferReply({ ephemeral: true });
    try {
      const data = await ctx.api.listDiscordLeagues();
      if (data.leagues.length === 0) {
        await ctx.interaction.editReply({
          content: "No Discord leagues yet. Use `/league create name:`.",
        });
        return;
      }
      const lines = data.leagues.map((l) => {
        const members = l.memberIds.map((id) => `<@${id}>`).join(" ");
        return `**${escapeMd(l.name)}** — owner <@${l.ownerId}> (${l.memberIds.length}/3)${members ? `\n  ${members}` : ""}`;
      });
      await ctx.interaction.editReply({ content: lines.join("\n\n") });
    } catch (err) {
      await ctx.interaction.editReply({ content: formatErr(err) });
    }
    return;
  }

  if (sub === "track" || sub === "untrack" || sub === "toggle-add") {
    if (
      !ctx.interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      await ctx.interaction.reply({
        content: "Need **Manage Server** for track/lock commands.",
        ephemeral: true,
      });
      return;
    }
  }

  if (sub === "list") {
    await ctx.interaction.deferReply({ ephemeral: true });
    try {
      const data = await ctx.api.trackedLeagues();
      const lock = data.additionsOpen ? "open" : "locked";
      if (data.tracked.length === 0) {
        await ctx.interaction.editReply({
          content: `Pinned PS99: none (additions **${lock}**).`,
        });
        return;
      }
      const lines = data.tracked.map(
        (t, i) =>
          `${i + 1}. **${escapeMd(t.name)}**${t.pending ? " _(pending)_" : ""}`,
      );
      await ctx.interaction.editReply({
        content: `Additions **${lock}**\n${lines.join("\n")}`,
      });
    } catch (err) {
      await ctx.interaction.editReply({ content: formatErr(err) });
    }
    return;
  }

  if (sub === "toggle-add") {
    await ctx.interaction.deferReply({ ephemeral: true });
    try {
      const forced = ctx.interaction.options.getBoolean("open");
      const result = await ctx.api.setLeagueAdditions(
        forced === null ? undefined : forced,
      );
      await ctx.interaction.editReply({
        content: result.additionsOpen
          ? "Create/track **open**."
          : "Create/track **locked**.",
      });
    } catch (err) {
      await ctx.interaction.editReply({ content: formatErr(err) });
    }
    return;
  }

  if (sub === "clear") {
    if (
      !ctx.interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      await ctx.interaction.reply({
        content: "Need **Manage Server** to clear pinned leagues.",
        ephemeral: true,
      });
      return;
    }
    await ctx.interaction.deferReply({ ephemeral: true });
    try {
      const result = await ctx.api.clearTrackedLeagues();
      await ctx.interaction.editReply({
        content: `Cleared **${result.cleared}** pinned league(s).`,
      });
    } catch (err) {
      await ctx.interaction.editReply({ content: formatErr(err) });
    }
    return;
  }

  if (sub === "clearall") {
    if (
      !ctx.interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator,
      )
    ) {
      await ctx.interaction.reply({
        content: "Need **Administrator** to clear all Discord leagues.",
        ephemeral: true,
      });
      return;
    }
    await ctx.interaction.deferReply({ ephemeral: true });
    try {
      const result = await ctx.api.clearDiscordLeagues();
      const ch = await resolveLeagueChannel(ctx, leagueChannelId);
      if (ch) await refreshSummaryEmbed(ctx, ch);
      await ctx.interaction.editReply({
        content: `Cleared **${result.cleared}** Discord league(s).`,
      });
    } catch (err) {
      await ctx.interaction.editReply({ content: formatErr(err) });
    }
    return;
  }

  await ctx.interaction.deferReply({ ephemeral: true });

  try {
    if (sub === "create") {
      const name = ctx.interaction.options.getString("name", true);
      const result = await ctx.api.createDiscordLeague(
        name,
        ctx.interaction.user.id,
      );
      const ch = await resolveLeagueChannel(ctx, leagueChannelId);
      if (ch) await refreshSummaryEmbed(ctx, ch);
      await ctx.interaction.editReply({
        content: `Created Discord league **${escapeMd(result.league.name)}**.`,
      });
      return;
    }

    if (sub === "add") {
      const user = ctx.interaction.options.getUser("user", true);
      const result = await ctx.api.addDiscordMember(
        ctx.interaction.user.id,
        user.id,
      );
      const ch = await resolveLeagueChannel(ctx, leagueChannelId);
      if (ch) await refreshSummaryEmbed(ctx, ch);
      await ctx.interaction.editReply({
        content: `Added <@${user.id}> to **${escapeMd(result.league.name)}** (${result.league.memberIds.length}/3).`,
      });
      return;
    }

    if (sub === "remove") {
      const user = ctx.interaction.options.getUser("user", true);
      const result = await ctx.api.removeDiscordMember(
        ctx.interaction.user.id,
        user.id,
      );
      const ch = await resolveLeagueChannel(ctx, leagueChannelId);
      if (ch) await refreshSummaryEmbed(ctx, ch);
      await ctx.interaction.editReply({
        content: `Removed <@${user.id}> from **${escapeMd(result.league.name)}**.`,
      });
      return;
    }

    if (sub === "disband") {
      const result = await ctx.api.disbandDiscordLeague(
        ctx.interaction.user.id,
      );
      const ch = await resolveLeagueChannel(ctx, leagueChannelId);
      if (ch) await refreshSummaryEmbed(ctx, ch);
      await ctx.interaction.editReply({
        content: `Disbanded **${escapeMd(result.league.name)}**.`,
      });
      return;
    }

    if (sub === "track") {
      const name = ctx.interaction.options.getString("name", true);
      const result = await ctx.api.addLeague(name, ctx.interaction.user.id);
      const pending = result.pending
        ? " (pending until PS99 has it)"
        : "";
      await ctx.interaction.editReply({
        content: `Tracking **${escapeMd(result.name)}** on the website.${pending}`,
      });
      return;
    }

    if (sub === "untrack") {
      const name = ctx.interaction.options.getString("name", true);
      const result = await ctx.api.removeLeague(name);
      await ctx.interaction.editReply({
        content: `Stopped tracking **${escapeMd(result.name)}**.`,
      });
      return;
    }

    await ctx.interaction.editReply({ content: "Unknown subcommand." });
  } catch (err) {
    await ctx.interaction.editReply({ content: formatErr(err) });
  }
};

async function resolveLeagueChannel(
  ctx: Parameters<ChatInputHandler>[0],
  channelId: string | null | undefined,
): Promise<GuildTextBasedChannel | null> {
  const id = channelId || ctx.interaction.channelId;
  if (!id) return null;
  try {
    const ch = await ctx.client.channels.fetch(id);
    if (ch && ch.isTextBased() && !ch.isDMBased()) {
      return ch as GuildTextBasedChannel;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function refreshSummaryEmbed(
  ctx: Parameters<ChatInputHandler>[0],
  channel: GuildTextBasedChannel | TextChannel,
) {
  try {
    const [data, settings] = await Promise.all([
      ctx.api.listDiscordLeagues(),
      ctx.api.leagueSettings(),
    ]);
    if (settings.summaryMessageId) {
      try {
        const prev = await channel.messages.fetch(settings.summaryMessageId);
        await prev.delete();
      } catch {
        /* ignore missing */
      }
    }

    const body =
      data.leagues.length === 0
        ? "No leagues yet. Use `/league create name:` to start one."
        : data.leagues
            .map((l) => {
              const members = l.memberIds.map((id) => `<@${id}>`).join(" ");
              return `**${l.name}** — <@${l.ownerId}> (${l.memberIds.length}/3)${members ? `\n${members}` : ""}`;
            })
            .join("\n\n");

    const embed = new EmbedBuilder()
      .setTitle("K0ii Leagues")
      .setColor(SUMMARY_COLOR)
      .setDescription(body)
      .setTimestamp(new Date());

    const msg = await channel.send({ embeds: [embed] });
    await ctx.api.setSummaryMessageId(msg.id);
  } catch (err) {
    console.error("[league] summary embed refresh failed", err);
  }
}

function formatErr(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return `API unreachable (\`${err.path}\`). Is \`apps/api\` running?`;
    }
    if (err.status === 401 || err.status === 503) {
      return "Bot secret missing or wrong (`BOT_API_SECRET`).";
    }
    if (err.message && !err.message.startsWith("API ")) return err.message;
    return `API \`${err.path}\` returned ${err.status}.`;
  }
  return err instanceof Error ? err.message : "League command failed.";
}
