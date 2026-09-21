import { getKp } from "@/lib/feeds";

export const revalidate = 300;

export async function GET() {
  const feed = await getKp();
  return Response.json(feed);
}
