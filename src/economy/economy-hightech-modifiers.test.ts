import { BodyFeature } from "../types";
import { BT, Sys } from "../types2";
import { buildSystemModel2 } from "./system-model2";

describe("high-tech body modifiers", () => {
  it("counts BIO and GEO separately for high-tech surface outposts", () => {
    const sys: Sys = {
      v: 6,
      rev: 18,
      name: "HD 165921",
      id64: 10910879,
      architect: "Dubior",
      pos: [-189.5, -70.75, 1482.40625],
      reserveLevel: "pristine",
      bodies: [
        {
          name: "HD 165921 A 12 a",
          num: 32,
          distLS: 5053.069548,
          parents: [30, 26, 1, 0],
          type: BT.rb,
          subType: "Rocky body",
          features: [BodyFeature.landable, BodyFeature.bio, BodyFeature.geo, BodyFeature.volcanism],
          radius: -1,
          temp: 630.217712,
          gravity: 0.309334760885082,
        },
        ...[14, 17, 25].map(num => ({
          name: `HD 165921 relay body ${num}`,
          num,
          distLS: 1000 + num,
          parents: [1, 0],
          type: BT.st,
          subType: "Star",
          features: [],
          radius: -1,
          temp: 1000,
          gravity: -1,
        })),
      ],
      sites: [
        {
          id: "kwon",
          name: "Kwon Nook",
          bodyNum: 32,
          buildType: "necessitas",
          status: "complete",
          buildId: "00125230-411d-406f-ad56-211121d99f0a",
          marketId: 4258028035,
        },
        { id: "hah", name: "Hah Analytics Complex", bodyNum: 32, buildType: "chronos", status: "complete", buildId: "hah", marketId: 4259925251 },
        { id: "ostrander", name: "Ostrander Enterprise", bodyNum: 32, buildType: "athena", status: "complete", buildId: "ostrander", marketId: 0 },
        { id: "barr", name: "Barr Reach", bodyNum: 17, buildType: "enodia", status: "complete", buildId: "barr", marketId: 0 },
        { id: "cugnot", name: "Cugnot Legacy", bodyNum: 25, buildType: "enodia", status: "complete", buildId: "cugnot", marketId: 0 },
        { id: "danforth", name: "Danforth Relay", bodyNum: 14, buildType: "ichnaea", status: "complete", buildId: "danforth", marketId: 0 },
        { id: "kalantari", name: "Kalantari Platform", bodyNum: 14, buildType: "enodia", status: "complete", buildId: "kalantari", marketId: 0 },
        { id: "sachs", name: "Sachs Reach", bodyNum: 25, buildType: "enodia", status: "complete", buildId: "sachs", marketId: 0 },
        { id: "wakata", name: "Wakata Enterprise", bodyNum: 17, buildType: "ichnaea", status: "complete", buildId: "wakata", marketId: 0 },
      ],
      slots: {},
      revs: [],
    };

    const sysMap = buildSystemModel2(sys, false, true);
    const site = sysMap.siteMaps.find(s => s.name === "Kwon Nook");

    expect(site?.economies?.hightech).toBeCloseTo(4.8);
    expect(site?.economyAudit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ inf: "hightech", delta: 0.4, reason: "Buff: body has BIO" }),
        expect.objectContaining({ inf: "hightech", delta: 0.4, reason: "Buff: body has GEO" }),
      ]),
    );
  });
});
