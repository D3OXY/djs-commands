const DefaultCommands = {
    ChannelOnly: "channelonly",
    CustomCommand: "customcommand",
    Prefix: "prefix",
    RequiredPermissions: "requiredpermissions",
    RequiredRoles: "requiredroles",
    ToggleCommand: "togglecommand",
} as const;

type DefaultCommands = (typeof DefaultCommands)[keyof typeof DefaultCommands];

export default DefaultCommands;
