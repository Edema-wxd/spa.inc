/** Tabs on the Settings page, selectable with `?tab=`. */
export const SETTINGS_TABS = ["account", "business", "notifications", "team", "plan"] as const

export type SettingsTab = (typeof SETTINGS_TABS)[number]
