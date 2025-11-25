const modTypeList = ["Character", "NPC", "UI", "Script-Tools", "Misc", "Unknown"] as const;
type ModType = (typeof modTypeList)[number];

export { modTypeList };
export type { ModType };
