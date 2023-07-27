// enum CommandType {
//     /**
//      * A command that can only be executed as a slash command.
//      */
//     SLASH = "SLASH",

//     /**
//      * A command that can only be executed using the legacy prefix.
//      */
//     LEGACY = "LEGACY",

//     /**
//      * A command that can be executed both as a slash command and using the legacy prefix.
//      */
//     BOTH = "BOTH",
// }

// export default CommandType;

const CommandType = {
    SLASH: "SLASH",
    LEGACY: "LEGACY",
    BOTH: "BOTH",
} as const;

type CommandType = (typeof CommandType)[keyof typeof CommandType];

export default CommandType;
