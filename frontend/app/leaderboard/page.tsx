import { ProductDataPage } from "@/components/ProductDataPage";

export default function LeaderboardPage() {
  return <ProductDataPage active="leaderboard" title="Leaderboard" endpoint="/product/home" />;
}
