import { GlobalStats, Project, ProjectRefLite, SortMode } from "./types";

enum Stored {
  cmdr = 'cmdr',
  recentProjects = 'recentProjects',
  deliver = 'deliver',
  deliverDestination = 'deliverDestination',
  sortMode = 'sortMode',
  hideCompleted = 'hideCompleted',
  hideFC = 'hideFC',
  primaryBuildId = 'primaryBuildId',
  cmdrLinkedFCs = 'cmdrLinkedFCs',
  globalStats = 'globalStats',
  theme = 'theme',
  hideShipTrips = 'hideShipTrips',
}

interface CmdrData {
  name: string;
  largeMax: number;
  medMax: number;
}

class LocalStorage {
  clearCmdr(): void {
    window.localStorage.removeItem(Stored.cmdr);
    window.localStorage.removeItem(Stored.recentProjects);
    window.localStorage.removeItem(Stored.deliverDestination);
    window.localStorage.removeItem(Stored.cmdrLinkedFCs);
  }

  get cmdrName() {
    return this.cmdr?.name ?? '';
  }

  set cmdrName(newValue: string) {
    const data = {
      ...this.cmdr ?? {},
      name: newValue
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

  set cmdr(newValue: CmdrData | undefined) {
    window.localStorage.setItem(Stored.cmdr, JSON.stringify(newValue));
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

  set deliver(newValue: Record<string, number>) {
    window.localStorage.setItem(Stored.deliver, JSON.stringify(newValue));
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

  set commoditySort(newValue: SortMode) {
    window.localStorage.setItem(Stored.sortMode, newValue);
  }

  get commoditySort(): SortMode {
    return window.localStorage.getItem(Stored.sortMode) as SortMode ?? SortMode.group;
  }

  set deliverDestination(newValue: string) {
    window.localStorage.setItem(Stored.deliverDestination, newValue);
  }

  get deliverDestination(): string {
    return window.localStorage.getItem(Stored.deliverDestination) ?? 'site';
  }

  set commodityHideCompleted(newValue: boolean) {
    window.localStorage.setItem(Stored.hideCompleted, JSON.stringify(newValue));
  }

  get commodityHideCompleted(): boolean {
    const json = window.localStorage.getItem(Stored.hideCompleted);
    if (!json)
      return false;
    else
      return JSON.parse(json) as boolean;
  };

  set commodityHideFCColumns(newValue: boolean) {
    window.localStorage.setItem(Stored.hideFC, JSON.stringify(newValue));
  }

  get commodityHideFCColumns(): boolean {
    const json = window.localStorage.getItem(Stored.hideFC);
    if (!json)
      return false;
    else
      return JSON.parse(json) as boolean;
  };

  set primaryBuildId(newValue: string) {
    window.localStorage.setItem(Stored.primaryBuildId, newValue);
  }

  get primaryBuildId(): string {
    return window.localStorage.getItem(Stored.primaryBuildId) ?? '';
  }

  set cmdrLinkedFCs(newValue: number[]) {
    window.localStorage.setItem(Stored.cmdrLinkedFCs, JSON.stringify(newValue));
  }

  /** Array of FC market IDs */
  get cmdrLinkedFCs(): number[] {
    const json = window.localStorage.getItem(Stored.cmdrLinkedFCs);
    if (!json)
      return [];
    else
      return JSON.parse(json) as number[];
  }

  set globalStats(newValue: GlobalStats | undefined) {
    window.localStorage.setItem(Stored.globalStats, JSON.stringify(newValue));
  }

  get globalStats(): GlobalStats | undefined {
    const json = window.localStorage.getItem(Stored.globalStats);
    if (!json)
      return undefined;
    else
      return JSON.parse(json) as GlobalStats;
  }

  get theme(): string {
    return window.localStorage.getItem(Stored.theme) ?? '';
  }

  set theme(newTheme: string) {
    window.localStorage.setItem(Stored.theme, newTheme);
  }

  set hideShipTrips(newValue: boolean) {
    window.localStorage.setItem(Stored.hideShipTrips, JSON.stringify(newValue));
  }

  get hideShipTrips(): boolean {
    const json = window.localStorage.getItem(Stored.hideShipTrips);
    if (!json)
      return false;
    else
      return JSON.parse(json) as boolean;
  };
}

export const store = new LocalStorage();