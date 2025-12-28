import { route } from "@funstack/router";
import { SettingsLayout } from "./SettingsLayout";
import { ProfileTab, AccountTab, NotificationsTab } from "./tabs";

export const settingsRoute = route({
  path: "settings",
  component: SettingsLayout,
  children: [
    route({ path: "profile", component: ProfileTab }),
    route({ path: "account", component: AccountTab }),
    route({ path: "notifications", component: NotificationsTab }),
  ],
});
