import { Project, ProjectRefLite, SortMode } from "./types";

enum Stored {
  cmdr = 'cmdr',
  recentProjects = 'recentProjects',
  deliver = 'deliver',
  deliverDestination = 'deliverDestination',
  sortMode = 'sortMode',
  hideCompleted = 'hideCompleted',
  hideFC = 'hideFC',
  primaryBuildId = 'primaryBuildId',
}

interface CmdrData {
  name: string;
  largeMax: number;
  medMax: number;
}

class LocalStorage {
  clearCmdr(): void {
    window.localStorage.removeItem(Stored.cmdr);
  }

  get cmdrName() {
    return this.cmdr?.name ?? '';
  }

  set cmdrName(cmdrName: string) {
    const data = {
      ...this.cmdr ?? {},
      name: cmdrName
    } as CmdrData;
    this.cmdr = data;
  }

  get cmdr(): CmdrData | undefined {
    const json = window.localStorage.getItem(Stored.cmdr);
    if (json) {
      return JSON.parse(json);
    } else {
      return undefined;
    }
  }

  set cmdr(cmdr: CmdrData | undefined) {
    window.localStorage.setItem(Stored.cmdr, JSON.stringify(cmdr));
  }

  get recentProjects(): ProjectRefLite[] {
    const json = window.localStorage.getItem(Stored.recentProjects);
    if (json) {
      const data = JSON.parse(json) as ProjectRefLite[];
      return data;
    } else {
      return [];
    }
  }

  addRecentProject(proj: Project): void {
    // read recent projects and remove entry for this project
    const recentProjects = this.recentProjects
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
  }

  removeRecentProject(buildId: string): void {
    // read recent projects and remove entry for this project
    const recentProjects = this.recentProjects
      .filter(rp => rp.buildId !== buildId);

    const json = JSON.stringify(recentProjects);
    window.localStorage.setItem(Stored.recentProjects, json)
  }

  set deliver(deliver: Record<string, number>) {
    window.localStorage.setItem(Stored.deliver, JSON.stringify(deliver));
  }

  get deliver(): Record<string, number> {
    const json = window.localStorage.getItem(Stored.deliver);
    if (json) {
      const data = JSON.parse(json) as Record<string, number>;
      return data;
    } else {
      return {};
    }
  }

  set commoditySort(sortMode: SortMode) {
    window.localStorage.setItem(Stored.sortMode, sortMode);
  }

  get commoditySort(): SortMode {
    return window.localStorage.getItem(Stored.sortMode) as SortMode ?? SortMode.group;
  }

  set deliverDestination(sortMode: string) {
    window.localStorage.setItem(Stored.deliverDestination, sortMode);
  }

  get deliverDestination(): string {
    return window.localStorage.getItem(Stored.deliverDestination) ?? 'site';
  }

  set commodityHideCompleted(hideCompleted: boolean) {
    window.localStorage.setItem(Stored.hideCompleted, JSON.stringify(hideCompleted));
  }

  get commodityHideCompleted(): boolean {
    const json = window.localStorage.getItem(Stored.hideCompleted);
    if (!json)
      return false;
    else
      return JSON.parse(json) as boolean;
  };

  set commodityHideFCColumns(hideFC: boolean) {
    window.localStorage.setItem(Stored.hideFC, JSON.stringify(hideFC));
  }

  get commodityHideFCColumns(): boolean {
    const json = window.localStorage.getItem(Stored.hideFC);
    if (!json)
      return false;
    else
      return JSON.parse(json) as boolean;
  };

  set primaryBuildId(primaryBuildId: string) {
    window.localStorage.setItem(Stored.primaryBuildId, primaryBuildId);
  }

  get primaryBuildId(): string {
    return window.localStorage.getItem(Stored.primaryBuildId) ?? '';
  }

}

export const store = new LocalStorage();