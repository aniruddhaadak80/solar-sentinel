export async function GET() {
  return Response.json({ ok: true, service: "solar-sentinel", time: new Date().toISOString() });
}
