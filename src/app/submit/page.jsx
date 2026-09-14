import { redirect } from "next/navigation";

// The real submission flow lives on /explore, which renders MushroomSubmissionForm.
// This route previously held a stray form posting to /api/mushrooms/create — an
// endpoint that does not exist — via an unrestricted file input that sidestepped
// the camera-only rule entirely. Redirect rather than 404, in case it is bookmarked.
export default function SubmitRedirect() {
  redirect("/explore");
}
