import { KnownFC, ProjectFC, QuickSearchStation } from "./types";

export const apiSvcUrl = //'https://localhost:7007'; /*
  'https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net'; // */


export const api = {
  /** Fleet Carrier APIs */
  fc: {
    match: async (name: string): Promise<Record<string, string>> => {
      const url = `${apiSvcUrl}/api/fc/match/${encodeURIComponent(name)}`;
      console.log('api.project.match:', url);

      const response = await fetch(url, { method: 'GET', });

      if (response.status === 200) {
        var matches: Record<string, string> = await response.json();
        return matches;
      }

      const msg = await response.text();
      throw new Error(msg);
    },

    find: async (name: string): Promise<QuickSearchStation[]> => {
      const url = `${apiSvcUrl}/api/fc/find/${encodeURIComponent(name)}`;
      console.log('api.project.find:', url);

      const response = await fetch(url, { method: 'GET', });

      if (response.status === 200) {
        var matches: QuickSearchStation[] = await response.json();
        return matches;
      }

      const msg = await response.text();
      throw new Error(msg);
    },

    get: async (marketId: string): Promise<KnownFC> => {
      const url = `${apiSvcUrl}/api/fc/${encodeURIComponent(marketId)}`;
      console.log('api.project.get:', url);

      const response = await fetch(url, { method: 'GET', });

      if (response.status === 200) {
        var fc: KnownFC = await response.json();
        return fc;
      }

      const msg = await response.text();
      throw new Error(msg);
    },

    updateCargo: async (marketId: number, cargo: Record<string, number>): Promise<Record<string, number>> => {
      const url = `${apiSvcUrl}/api/fc/${encodeURIComponent(marketId)}/cargo`;
      console.log('api.project.updateCargo:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(cargo)
      });

      if (response.status === 200) {
        var cargoUpdated: Record<string, number> = await response.json();
        return cargoUpdated;
      }

      const msg = await response.text();
      throw new Error(msg);
    },

    deliverToFC: async (marketId: string, cargo: Record<string, number>): Promise<Record<string, number>> => {
      const url = `${apiSvcUrl}/api/fc/${encodeURIComponent(marketId)}/cargo`;
      console.log('api.project.deliverToFC:', url);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(cargo),
      });

      if (response.status === 200) {
        var newCommodities: Record<string, number> = await response.json();
        return newCommodities;
      }

      const msg = await response.text();
      throw new Error(msg);
    },

  },

  /** Project APIs */
  project: {
    deliverToSite: async (buildId: string, cmdr: string, cargo: Record<string, number>): Promise<Record<string, number>> => {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}/supply/${encodeURIComponent(cmdr)}`;
      console.log('api.project.deliverToSite:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(cargo),
      });

      if (response.status === 200) {
        var newCommodities: Record<string, number> = await response.json();
        return newCommodities;
      }

      const msg = await response.text();
      throw new Error(msg);
    },

    /** Add a link between FC and a project */
    getCargoFC: async (buildId: string): Promise<Record<string, Record<string, number>>> => {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}/fc/`;
      console.log('api.project.getFCCargo:', url);

      const response = await fetch(url, { method: 'GET' });

      if (response.status === 200) {
        var fcCargo: Record<string, Record<string, number>> = await response.json();
        return fcCargo;
      }

      const msg = await response.text();
      throw new Error(msg);
    },

    /** Add a link between FC and a project */
    linkFC: async (buildId: string, marketId: string): Promise<ProjectFC[]> => {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}/fc/${encodeURIComponent(marketId)}`;
      console.log('api.project.linkFC:', url);

      const response = await fetch(url, { method: 'PUT' });

      if (response.status === 200) {
        var linkedFCs: ProjectFC[] = await response.json();
        return linkedFCs;
      }

      const msg = await response.text();
      throw new Error(msg);
    },

    /** Remove a link between FC and a project */
    unlinkFC: async (buildId: string, marketId: number): Promise<ProjectFC[]> => {
      const url = `${apiSvcUrl}/api/project/${encodeURIComponent(buildId)}/fc/${encodeURIComponent(marketId)}`;
      console.log('api.project.unlinkFC:', url);

      const response = await fetch(url, { method: 'DELETE' });

      if (response.status === 200) {
        var linkedFCs: ProjectFC[] = await response.json();
        return linkedFCs;
      }

      const msg = await response.text();
      throw new Error(msg);
    },
  }


};