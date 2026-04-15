import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  TextChannel,
  ActivityType,
  REST,
  Routes,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import cron from "node-cron";
import { getWordOfTheDay, koreanWords, type KoreanWord } from "./words.js";

const DISCORD_BOT_TOKEN = process.env["DISCORD_BOT_TOKEN"];
const DISCORD_CHANNEL_ID = process.env["DISCORD_CHANNEL_ID"];

if (!DISCORD_BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN is required");
if (!DISCORD_CHANNEL_ID) throw new Error("DISCORD_CHANNEL_ID is required");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  new SlashCommandBuilder().setName("word").setDescription("Get today's Korean word of the day"),
  new SlashCommandBuilder().setName("help").setDescription("Show available bot commands"),
];

function buildWordEmbed(word: KoreanWord, isDaily: boolean): EmbedBuilder {
  const partOfSpeechEmoji: Record<string, string> = {
    noun: "📦", verb: "⚡", adjective: "🎨", "adjective/verb": "🎨", expression: "💬",
  };
  const emoji = partOfSpeechEmoji[word.partOfSpeech] ?? "📖";

  return new EmbedBuilder()
    .setColor(0x4169e1)
    .setTitle(isDaily ? "🇰🇷 Korean Word of the Day" : "🇰🇷 Korean Word")
    .setDescription([
      `## ${word.korean}`,
      `**Romanization:** *${word.romanization}*`,
      `**English:** ${word.english}`,
    ].join("\n"))
    .addFields(
      { name: `${emoji} Part of Speech`, value: word.partOfSpeech.charAt(0).toUpperCase() + word.partOfSpeech.slice(1), inline: true },
      { name: "📝 Example Sentence", value: `**Korean:** ${word.exampleKorean}\n**English:** ${word.exampleEnglish}` }
    )
    .setFooter({
      text: isDaily
        ? `Word ${(koreanWords.indexOf(word) % koreanWords.length) + 1} of ${koreanWords.length} • Daily post`
        : "Use /word to get today's word anytime",
    })
    .setTimestamp();
}

async function postWordOfTheDay(): Promise<void> {
  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID!);
    if (!channel || !(channel instanceof TextChannel)) {
      console.error("Channel not found or not a text channel:", DISCORD_CHANNEL_ID);
      return;
    }
    const word = getWordOfTheDay();
    await channel.send({ embeds: [buildWordEmbed(word, true)] });
    console.log("Posted word of the day:", word.korean);
  } catch (err) {
    console.error("Failed to post word of the day:", err);
  }
}

client.once("clientReady", async (c) => {
  console.log(`Discord bot ready: ${c.user.tag}`);
  c.user.setActivity("Korean Word of the Day", { type: ActivityType.Watching });

  const rest = new REST().setToken(DISCORD_BOT_TOKEN!);
  await rest.put(Routes.applicationCommands(c.user.id), {
    body: commands.map((cmd) => cmd.toJSON()),
  });
  console.log("Registered slash commands");

  cron.schedule("0 9 * * *", async () => {
    console.log("Posting scheduled word of the day");
    await postWordOfTheDay();
  }, { timezone: "Europe/London" });

  console.log("Scheduled daily post at 9:00 AM UK time");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const i = interaction as ChatInputCommandInteraction;

  if (i.commandName === "word") {
    await i.reply({ embeds: [buildWordEmbed(getWordOfTheDay(), false)] });
  }

  if (i.commandName === "help") {
    await i.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x4169e1)
          .setTitle("🇰🇷 Korean Word Bot - Commands")
          .addFields(
            { name: "/word", value: "Get today's Korean word of the day" },
            { name: "/help", value: "Show this help message" }
          )
          .setFooter({ text: "A new word is posted every day at 9:00 AM UK time" })
          .setTimestamp(),
      ],
    });
  }
});

client.on("error", (err) => console.error("Discord client error:", err));

console.log("Starting Korean Word Bot...");
await client.login(DISCORD_BOT_TOKEN);
