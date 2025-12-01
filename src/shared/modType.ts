const modTypeList = ["Character", "NPC", "Environment", "UI", "Script-Tool", "Misc", "Unknown"] as const;
type ModType = (typeof modTypeList)[number];

export { modTypeList };
export type { ModType };
