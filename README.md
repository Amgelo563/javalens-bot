# 🔍 `javalens-bot`

[![Build Status](https://img.shields.io/github/actions/workflow/status/Amgelo563/javalens-bot/build.yml?style=for-the-badge&logo=github)](https://github.com/Amgelo563/javalens-bot/actions/workflows/build.yml)
[![Latest Release](https://img.shields.io/github/v/release/Amgelo563/javalens-bot?style=for-the-badge&logo=nodedotjs&color=5FA04E)](https://github.com/Amgelo563/javalens-bot/releases/latest)
[![Built with Typescript](https://img.shields.io/badge/Built%20with-Typescript-3176C6?style=for-the-badge&logo=typescript&logoColor=3178C6)](https://www.typescriptlang.org/)

A lightweight Discord bot for searching on Javadocs through slash commands.


https://github.com/user-attachments/assets/aea3e29b-665f-4a39-a5d4-1f9de5212451


---

## 🚧 Warnings (READ THIS!)

- The bot works by scraping each Javadoc, and saving **every** message in a local `__cache__` folder. This is done to avoid querying them in runtime, so (apart from the Discord connection), the bot works entirely offline.
- Depending on the javadoc's size, **this can get storage-heavy and take a while (100+ MBs and 5-10 mins for a large javadoc).** However, it shouldn't need more than 5-10 MBs of RAM while running.
- There are options to make the process faster, though not lighter. For more information, check the `advanced` field in the config documentation.
- This uses the [`javadocs-scraper`](http://github.com/Amgelo563/javadocs-scraper) library for the scraping process. For issues with the scraping, please open an issue there instead.

## 🧩 Features

### 🧱 Custom commands
- Define your command's entire data, down to the [Installation](https://discord.com/developers/docs/resources/application#installation-context) and [Interaction](https://discord.com/developers/docs/interactions/application-commands#interaction-contexts) contexts.
- Group javadocs in a single command with subcommands, eg `/my-project v1 <query>` and `/my-project v2 <query>`.
- [Localize](https://discord-api-types.dev/api/discord-api-types-v10/enum/Locale#Index) commands and their options for Discord clients on a specific language.

### 🔍 Advanced querying
- Query for classes, methods, fields, enums, enum constants, annotations and annotation elements with a single option.
- Filter results based on key characters, eg. `@` for annotations and `#`/`.` for methods or fields.

### 📚 Useful results
- Get a insightful yet concise summary of the result, including short descriptions, parameters, return types and relevant links to the full documentation.
- Documents and highlights deprecation and/or for removal elements.

## 💻 Usage
### 1. ⚙ Configuration

Create a `config.conf` file. The `example-config.conf` has a minimal example, the following is more complete with all the options available.

> [!TIP]
> If an option is listed as optional, you can not only omit it, but also partially define it.
> For example, if you want to change the `description` max length, you can only define that option and the rest will fallback to the defaults shown here.

```hocon
// The bot's token
token: "spooky"

// The commands' options.
options: {
  // The option to input the query.
  query: {
    name: "query"
    description: "The searched query. Use # or . to separate objects from members (eg. List#add())."

    // Optional, localization data for Discord clients on a specific language.
    // See https://discord-api-types.dev/api/0.37.92/discord-api-types-rest/common/enum/Locale#Index for available locales.
    locale: {
      SpanishES: {
        name: "consulta",
        description: "La consulta a buscar. Usa # o . para separar objetos de miembros (ej. List#add())."
      }
    },
  }
  // The option to hide the output, optional to the user as it defaults to false.
  hide: {
    name: "hide"
    description: "Whether to hide the output"

    // Optional, localization data for Discord clients on a specific language.
    // See https://discord-api-types.dev/api/0.37.92/discord-api-types-rest/common/enum/Locale#Index for available locales.
    locale: {
      SpanishES: {
        name: "ocultar",
        description: "Si es que se debe ocultar la salida"
      }
    },
  }
}

// The javadoc commands. This can be a standalone command (first example)
// or a parent command (second example).
commands: [
  {
    // The command's name, used to invoke it.
    name: "my-project"
    // The command's description, shown in the autocomplete and when invoking it.
    description: "Use this command to query MyProject's javadocs",
    // The Javadoc's URL. This can be an HTTP(S) URL or a local file path, prepended with `file:`.
    // If it's a file path, it's taken as absolute if it starts with `/`, otherwise it's relative
    // to the bot's root (where the `config.conf` file is). It must also point to the index.html file,
    // or overview-summary.html for Javadocs older than Java 11.
    url: "https://myproject.com/javadocs",
    // The Javadoc's title, shown in messages and logging.
    title: "My Project",

    // Optional, the amount of days to store messages before re-scraping.
    // If set to <= 0, they will never expire. Defaults to -1.
    cacheDays: -1,

    // Optional, the command's integration types.
    // In essence, where the command can be installed.
    // See https://discord-api-types.dev/api/discord-api-types-v10/enum/ApplicationIntegrationType.
    integrationTypes: [
      "GuildInstall", // Will show up when the app is installed on a Guild.
      "UserInstall", // Will show up when the app is installed on a User.
    ]

    // Optional, the command's supported interaction contexts.
    // In essence, where the command can be used after being installed with one of its supported integration types.
    // See https://discord-api-types.dev/api/discord-api-types-v10/enum/InteractionContextType.
    interactionContexts: [
      "BotDM", // Can be used in the bot's DM.
      "PrivateChannel", // Can be used in a private channel including DM Groups, after being "UserInstall"ed.
      "Guild", // Can be used in a guild, after being "GuildInstall"ed.
    ]


    // Optional, localization data for Discord clients on a specific language.
    // See https://discord-api-types.dev/api/0.37.92/discord-api-types-rest/common/enum/Locale#Index for available locales.
    locale: {
      SpanishES: {
        name: "mi-proyecto",
        description: "Usa este comando para consultar la documentación de MyProject",
      }
    },
  }
  {
    name: "versioned-project"
    description: "Use this command to query VersionedProject's javadocs"
    
    // An array of subcommands, each with its own Javadoc URL, title, and optional cacheDays.
    // A command cannot have subcommands and a url/title at the same time.
    subcommands: [
      {
        name: "v1"
        description: "Use this command to query v1's javadocs"
        url: "https://otherversionedproject.com/v1/javadocs",
        title: "Versioned Project v1",
        // Localization data can also be defined for subcommands.
      }
      {
        name: "v2"
        description: "Use this command to query v2's javadocs"
        url: "https://otherversionedproject.com/v2/javadocs",
        title: "Versioned Project v2",
      }
    ]
  }
]

// Optional, some messages to use in the bot. Defaults to the values shown below.
messages: {
  // For brevity, codeblocks are omitted from messages. They will be replaced with the value below.
  codeblockOmitted: "(Codeblock omitted for brevity)"
  // A generic error message shown to users when there was an error while processing the command.
  error: "An error occurred. Please try again, or contact a staff member if this keeps ocurring."
  // An error message shown to users when they don't choose an option from the autocomplete.
  invalidOption: "Invalid option. Please choose one from the autocomplete."
}

// Optional, defaults to true. Whether to run the bot in debug mode, this'll show more useful info while
// javadocs are being scraped.
debug: true

// Optional, the maximum length per output part. Defaults to the following values, reasonable while testing.
// Link embeddings also count towards the max length, since that's also how Discord counts the message length.
// WARNING: This is applied while scraping. If you want to later change the max length, you'll need to
// delete the cache and let the bot generate it again.
maxLength: {
  // The maximum length of the entity's description (directly below the name).
  description: 500
  // The maximum length of the entity's deprecation/removal note.
  deprecation: 150
  // The maximum length of each "extra" property:
  // Return types', parameters', and annotation elements' descriptions.
  extraPropertiesDescription: 350
}

// Optional, aesthetic prefixes to each message content and autocompletions, to visually differ each entity.
prefixes: {
  // The prefixes to each message content, to visually differ each entity. Defaults to the following values.
  message: {
    class: "🏛️"
    interface: '🧩',
    enum: '🔠',
    enumConstant: '📍',
    method: '🛠️',
    field: '🔑',
    annotation: '🏷️',
    annotationElement: '🔖',
  }
  // The prefixes to each autocompletion, to visually differ each entity. Defaults to the following values.
  autocomplete: {
    class: "🏛️"
    interface: '🧩',
    enum: '🔠',
    enumConstant: '📍',
    method: '🛠️',
    field: '🔑',
    annotation: '🏷️',
    annotationElement: '🔖',
  }
}

// Optional, advanced configuration options to make the scraping process faster,
// though not lighter. See the "Advanced Configuration" section for proper information.
advanced: {
  // Global advanced options for the whole process
  global: {
    // Maximum amount of workers to use at once. Each worker will scrape one Javadoc at a time,
    // so 2 workers means that the bot will scrape 2 Javadocs at once.
    maxWorkers: 2,
  }
  // Per-worker options
  perWorker: {
    // The maximum amount of message file writes at a given time.
    fileWritePoolSize: 3,
    // Worker resource limits. See https://nodejs.org/api/worker_threads.html#worker_threads_worker_resourcelimits
    // Only maxOldSpaceSizeMb has a default, the rest are left to Node's defaults.
    resourceLimits: {
      // The maximum amount of memory the worker can use, in MBs.
      // If you use the `--max-old-space-size` flag, it'll take precedence over this. See https://github.com/nodejs/node/issues/43991
      maxOldSpaceSizeMb: 1024
    }
  }
}
```

## 2. 📦 Installing and Running

Run `pnpm install` to install the required dependencies, then `pnpm clean-start` to build and run the bot.
- After building, you can run `pnpm start` to run the bot without rebuilding it.
- If you ever want to update, `git pull` the latest changes and run `pnpm clean-start` again.
