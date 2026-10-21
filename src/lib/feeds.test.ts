import { afterEach, describe, expect, it, vi } from "vitest";
import { getSolarWind } from "./feeds";

const WIND_ROW = {
  time_tag: "2026-10-20T21:02:00",
  active: true,
  proton_speed: 512.3,
  proton_temperature: 91234,
  proton_density: 8.1,
};

const MAG_ROW = {
  time_tag: "2026-10-20T21:02:00",
  active: true,
  bt: 9.63,
  bz_gsm: -5.2,
};

describe("rtsw join", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("joins the magnetic-field row for the same minute", async () => {
    vi.stubGlobal("fetch", async (input: unknown) => {
      const url = String(input);
      const body = url.includes("rtsw_mag_1m.json") ? [MAG_ROW] : [WIND_ROW];
      return { ok: true, status: 200, json: async () => body } as unknown as Response;
    });

    const feed = await getSolarWind();
    expect(feed.fallback).toBe(false);
    expect(feed.data.length).toBe(1);
    expect(feed.data[0].bzGsm).toBe(-5.2);
    expect(feed.data[0].bt).toBe(9.63);
  });

  it("joins when the seconds component differs between the two feeds", async () => {
    vi.stubGlobal("fetch", async (input: unknown) => {
      const url = String(input);
      const body = url.includes("rtsw_mag_1m.json")
        ? [{ ...MAG_ROW, time_tag: "2026-10-20T21:02:00" }]
        : [{ ...WIND_ROW, time_tag: "2026-10-20T21:02" }];
      return { ok: true, status: 200, json: async () => body } as unknown as Response;
    });

    const feed = await getSolarWind();
    expect(feed.data[0].bzGsm).toBe(-5.2);
  });
});
