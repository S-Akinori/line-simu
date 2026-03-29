import { redirect } from "next/navigation";

// Registration is invite-only. Direct access redirects to login.
export default function RegisterPage() {
  redirect("/login");
}
