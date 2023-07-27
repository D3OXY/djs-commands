// enum CooldownTypes {
//     perUser = "perUser",
//     perUserPerGuild = "perUserPerGuild",
//     perGuild = "perGuild",
//     global = "global",
// }

// export default CooldownTypes;

const CooldownTypes = {
    perUser: "perUser",
    perUserPerGuild: "perUserPerGuild",
    perGuild: "perGuild",
    global: "global",
} as const;

type CooldownTypes = (typeof CooldownTypes)[keyof typeof CooldownTypes];

export default CooldownTypes;
