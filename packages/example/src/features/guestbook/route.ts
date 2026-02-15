import { route } from "@funstack/router";
import { GuestbookPage } from "./GuestbookPage";
import { fetchEntries, addEntry } from "./data";

export const guestbookRoute = route({
  path: "guestbook",
  action: async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const message = formData.get("message") as string;
    return addEntry(name, message);
  },
  loader: async ({ actionResult }) => {
    const entries = await fetchEntries();
    return { entries, actionResult: actionResult ?? null };
  },
  component: GuestbookPage,
});
