import type { Metadata } from "next";
import { BtpCompetitiveLab } from "./BtpCompetitiveLab";

export const metadata: Metadata = {
  title: "Lab · Cartographie BTP",
  description: "Matrice concurrentielle BTP / Travaux publics et fiches commerciales ESN.",
};

export default function LabPage() {
  return <BtpCompetitiveLab />;
}
