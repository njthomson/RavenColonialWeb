import { Project, ProjectRefLite } from "./types";

enum Stored {
  cmdr = 'cmdr',
  recentProjects = 'recentProjects',
  deliver = 'deliver',
  sortMode = 'sortMode',
  hideCompleted = 'hideCompleted',
}

interface CmdrData {
  name: string;
  largeMax: number;
  medMax: number;
}

export namespace Store {
  export const clearCmdr = (): void => {
    window.localStorage.removeItem(Stored.cmdr);
  }

  export const getCmdr = (): CmdrData | undefined => {
    const json = window.localStorage.getItem(Stored.cmdr);
    if (json) {
      return JSON.parse(json);
    } else {
      return undefined;
    }
  }

  export const setCmdr = (cmdr: CmdrData): void => {
    window.localStorage.setItem(Stored.cmdr, JSON.stringify(cmdr));
  }


  export const getRecentProjects = () => {
    const json = window.localStorage.getItem(Stored.recentProjects);
    if (json) {
      const data = JSON.parse(json) as ProjectRefLite[];
      return data;
    } else {
      return [];
    }
  };

  export const addRecentProject = (proj: Project): void => {
    // read recent projects and remove entry for this project
    const recentProjects = getRecentProjects()
      .filter(rp => rp.buildId !== proj.buildId);

    const newRef: ProjectRefLite = {
      buildId: proj.buildId,
      systemName: proj.systemName!,
      buildName: proj.buildName,
      buildType: proj.buildType,
    };

    // add to the array, trim if getting too long
    recentProjects.unshift(newRef);

    if (recentProjects.length > 5) {
      recentProjects.pop();
    }

    const json = JSON.stringify(recentProjects);
    window.localStorage.setItem(Stored.recentProjects, json)
  };

  export const removeRecentProject = (buildId: string): void => {
    // read recent projects and remove entry for this project
    const recentProjects = getRecentProjects()
      .filter(rp => rp.buildId !== buildId);

    const json = JSON.stringify(recentProjects);
    window.localStorage.setItem(Stored.recentProjects, json)
  };

  export const setDeliver = (deliver: Record<string, number>): void => {
    window.localStorage.setItem(Stored.deliver, JSON.stringify(deliver));
  }

  export const getDeliver = (): Record<string, number> => {
    const json = window.localStorage.getItem(Stored.deliver);
    if (json) {
      const data = JSON.parse(json) as Record<string, number>;
      return data;
    } else {
      return {};
    }
  };

  export const setCommoditySort = (sortMode: string): void => {
    window.localStorage.setItem(Stored.sortMode, sortMode);
  }

  export const getCommoditySort = (): string | undefined => {
    return window.localStorage.getItem(Stored.sortMode) ?? undefined;
  };

  export const setCommodityHideCompleted = (hideCompleted: boolean): void => {
    window.localStorage.setItem(Stored.hideCompleted, JSON.stringify(hideCompleted));
  }

  export const getCommodityHideCompleted = (): boolean => {
    const json = window.localStorage.getItem(Stored.hideCompleted);
    if (!json)
      return false;
    else
      return JSON.parse(json) as boolean;
  };

}