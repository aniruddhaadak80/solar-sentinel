import { getSolarWind } from "@/lib/feeds";

export const revalidate = 300;

export async function GET() {
  const feed = await getSolarWind();
  return Response.json(feed);
}
