// Importare le dipendenze / Import dependencies
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require("discord.js");
const { exec } = require("child_process");

// Funzione che interroga Ollama con un prompt e restituisce la risposta IA
function queryOllama(prompt) {
  return new Promise((resolve, reject) => {
    // Usa il modello mistral (latest)
    const command = `echo "${prompt.replace(
      /"/g,
      "'"
    )}" | ollama run mistral:latest`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Esporta la funzione per i test Jest
module.exports = { queryOllama };

// Mappa per salvare il contesto per ogni canale
const contextMap = {};

// Avvia il bot solo se il file è eseguito direttamente (non durante i test)
if (require.main === module) {
  // Inizializza il bot Discord con i permessi necessari
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  // Funzione chiamata quando il bot è pronto
  function onReady(client) {
    console.log(`🤖 Umberto IA è online come ${client.user.tag}`);
  }

  // Gestisce i messaggi ricevuti nel canale "umberto-ia"
  async function onMessageCreate(message, client) {
    if (message.author.bot) return;
    if (message.channel.name === "umberto-ia") {
      const channelId = message.channel.id;
      const prompt = message.content.replace(/<@!?\d+>/, "").trim();
      if (!prompt) {
        await message.reply("Ciao! Sono Umberto IA, come posso aiutarti? 🤖");
        return;
      }

      // Recupera il contesto precedente o inizializza
      if (!contextMap[channelId]) contextMap[channelId] = [];
      contextMap[channelId].push(`Utente: ${prompt}`);

      // Costruisci il prompt con il contesto (ultimi 30 messaggi)
      const context = contextMap[channelId].slice(-30).join("\n");
      await message.channel.send("🧠 Umberto IA sta pensando...🤖");
      try {
        const reply = await queryOllama(context);
        contextMap[channelId].push(`Umberto IA: ${reply}`);
        console.log("Risposta inviata su Discord:", reply);

        // Crea il bottone "Cancella memoria"
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("clear_context")
            .setLabel("🧹 Cancella memoria")
            .setStyle(ButtonStyle.Danger)
        );

        await message.reply({ content: reply, components: [row] });
      } catch (error) {
        console.error(error);
        await message.reply("Ops! Qualcosa è andato storto con Ollama.");
      }
    }
  }

  // Listener per il click sul bottone
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === "clear_context") {
      const channelId = interaction.channel.id;
      contextMap[channelId] = [];
      await interaction.reply({
        content: "Memoria della conversazione cancellata! 🧹",
        ephemeral: true,
      });
    }
  });

  // Carica le variabili d'ambiente dal file .env
  require("dotenv").config();

  // Registra gli handler per gli eventi Discord
  client.on("ready", onReady);
  client.on("messageCreate", onMessageCreate);

  // Accedi al bot utilizzando il token dal file .env
  client.login(process.env.DISCORD_TOKEN);
}
