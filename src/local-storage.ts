import { Project, ProjectRefLite } from "./types";

enum Keys {
  cmdr = 'cmdr',
  recentProjects = 'recentProjects',
}

interface CmdrData {
  name: string;
  largeMax: number;
  medMax: number;
}

export namespace Store {
  export const clearCmdr = (): void => {
    window.localStorage.removeItem(Keys.cmdr);
  }

  export const getCmdr = (): CmdrData | undefined => {
    const json = window.localStorage.getItem(Keys.cmdr);
    if (json) {
      return JSON.parse(json);
    } else {
      return undefined;
    }
  }

  export const setCmdr = (cmdr: CmdrData): void => {
    window.localStorage.setItem(Keys.cmdr, JSON.stringify(cmdr));
  }


  export const getRecentProjects = () => {
    const json = window.localStorage.getItem(Keys.recentProjects);
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
    window.localStorage.setItem(Keys.recentProjects, json)
  };
}