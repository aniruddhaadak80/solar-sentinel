import { getFlares } from "@/lib/feeds";

export const revalidate = 1800;

export async function GET() {
  const feed = await getFlares();
  return Response.json(feed);
}
