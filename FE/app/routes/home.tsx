import HomePage from "~/pages/homePage";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Logistic" }];
}

export default function Home() {
  return <HomePage />;
}
