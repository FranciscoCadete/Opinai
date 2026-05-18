import type { Metadata } from "next";
import ChannelsClient from "../ChannelsClient";

export const metadata: Metadata = { title: "Canais" };

export default function ChannelsPage() {
  return <ChannelsClient />;
}
