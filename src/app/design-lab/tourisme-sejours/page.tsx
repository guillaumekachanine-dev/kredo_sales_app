import type { Metadata } from "next";
import { TourismStudyLab } from "./TourismStudyLab";
import { getTourismStudy } from "./study-data";

export const metadata: Metadata = {
  title: "Design Lab · Tourisme & Séjours",
  description: "Trois directions graphiques pour la cartographie concurrentielle Tourisme & Séjours.",
};

export default function TourismStudyLabPage() {
  return <TourismStudyLab study={getTourismStudy()} />;
}
