import { redirect } from "react-router";

export async function clientLoader() {
  throw redirect("/admin/orders");
}

export default function AdminIndexPage() {
  return null;
}
