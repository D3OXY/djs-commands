/**
 * Enum representing the type of command.
 * @enum {string}
 */
enum CommandType {
    /**
     * A command that can only be executed as a slash command.
     */
    SLASH = "SLASH",

    /**
     * A command that can only be executed using the legacy prefix.
     */
    LEGACY = "LEGACY",

    /**
     * A command that can be executed both as a slash command and using the legacy prefix.
     */
    BOTH = "BOTH",
}

export default CommandType;
