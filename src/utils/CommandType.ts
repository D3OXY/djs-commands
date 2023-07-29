const CommandType = {
    SLASH: "SLASH",
    LEGACY: "LEGACY",
    BOTH: "BOTH",
} as const;

type CommandType = (typeof CommandType)[keyof typeof CommandType];

export default CommandType;
