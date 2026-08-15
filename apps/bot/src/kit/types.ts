import type {
  ChatInputCommandInteraction,
  Client,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

import type { ApiClient } from "../api/client";

export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | RESTPostAPIChatInputApplicationCommandsJSONBody;

export type CommandContext = {
  interaction: ChatInputCommandInteraction;
  client: Client;
  api: ApiClient;
  /** Loaded slash command names → descriptions (for /help). */
  commands: ReadonlyMap<string, string>;
};

export type ChatInputHandler = (ctx: CommandContext) => Promise<void>;

export type CommandModule = {
  command: SlashCommandData;
  chatInput: ChatInputHandler;
};

export type EventModule = {
  event: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
};

export type MiddlewareModule = {
  before?: (ctx: CommandContext) => Promise<boolean | void> | boolean | void;
  after?: (ctx: CommandContext) => Promise<void> | void;
};

export type LoadedCommand = {
  name: string;
  description: string;
  data: RESTPostAPIChatInputApplicationCommandsJSONBody;
  chatInput: ChatInputHandler;
};

export function toCommandJson(
  command: SlashCommandData,
): RESTPostAPIChatInputApplicationCommandsJSONBody {
  if (typeof command === "object" && command !== null && "toJSON" in command) {
    return (
      command as SlashCommandBuilder
    ).toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody;
  }
  return command as RESTPostAPIChatInputApplicationCommandsJSONBody;
}
