import { BodyFeature } from "../types";
import { BT, Sys } from "../types2";
import { buildSystemModel2 } from "./system-model2";

describe("agriculture body modifiers", () => {
  it("applies the rocky-ice agriculture penalty to bio colony outposts", () => {
    const sys: Sys = {
      v: 6,
      rev: 4,
      name: "Eagle Sector CV-Y c13",
      id64: 3653909977090,
      architect: "Dubior",
      pos: [-2001.8125, 114.375, 6617.875],
      reserveLevel: "pristine",
      bodies: [
        {
          name: "Eagle Sector CV-Y c13 C 2",
          num: 7,
          distLS: 113749.017306,
          parents: [5, 4, 0],
          type: BT.ri,
          subType: "Rocky Ice world",
          features: [BodyFeature.landable, BodyFeature.bio, BodyFeature.atmosphere],
          radius: -1,
          temp: 101.045906,
          gravity: 0.0523749362700112,
        },
      ],
      sites: [
        {
          id: "e13c47b0-53fa-4d21-8472-d3e805894272",
          name: "Hendel Platform",
          bodyNum: 7,
          buildType: "vesta",
          status: "complete",
          buildId: "e13c47b0-53fa-4d21-8472-d3e805894272",
          marketId: 3961278722,
        },
      ],
      slots: {},
      revs: [],
    };

    const sysMap = buildSystemModel2(sys, false, true);
    const site = sysMap.siteMaps[0];

    expect(site.economies?.agriculture).toBeCloseTo(1.0);
    expect(site.economyAudit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          inf: "agriculture",
          delta: -0.4,
          reason: "Buff: body is ICY/ROCKY-ICE or has TIDAL",
        }),
      ]),
    );
  });
});
