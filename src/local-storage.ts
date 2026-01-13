import * as api from './api';
import { FindMarketsOptions, FoundMarkets, GlobalStats, Project, ProjectRefLite, SortMode } from "./types";
import { SiteGraphType } from './types2';
import { fcFullName } from './util';

enum Stored {
  cmdr = 'cmdr',
  apiKey = 'apiKey',
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
  useNativeDiscord = 'useNativeDiscord',
  useIncomplete = 'useIncomplete',
  findMarketsOptions = 'findMarketsOptions',
  foundMarkets = 'foundMarkets',
  notAgain = 'notAgain',
  buildTypeGrid = 'buildTypeGrid',
  sysView2View = 'sysView2View',
  sysViewHideEmpties = 'sysViewHideEmpties',
  viewEditBuiltTypeTab = 'viewEditBuiltTypeTab',
  siteGraphType = 'siteGraphType',
  autoCheckSpanshEconomies = 'autoCheckSpanshEconomies',
  archFav = 'archFav',
  viewAllHiddenFC = 'viewAllHiddenFC',
  applyBuffNerf = 'applyBuffNerf',
  recentID64 = 'recentID64',
}

interface CmdrData {
  name: string;
  largeMax: number;
  medMax: number;
}

const writeValue = (key: Stored, newValue: unknown) => {
  if (typeof newValue === 'undefined') {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, typeof newValue === 'string' ? newValue : JSON.stringify(newValue));
  }
};

const readString = (key: Stored, defaultValue: string = ''): string => window.localStorage.getItem(key) ?? defaultValue;

const readValue = <T>(key: Stored, defaultValue?: T): T | undefined => {
  const json = window.localStorage.getItem(key);
  if (json === null)
    return defaultValue;
  else
    return JSON.parse(json!) as T;
}

const readBoolean = (key: Stored, defaultValue?: boolean): boolean => !!readValue(key, defaultValue);

class LocalStorage {
  clearCmdr(): void {
    window.localStorage.removeItem(Stored.cmdr);
    window.localStorage.removeItem(Stored.apiKey);
    window.localStorage.removeItem('auth1');
    window.localStorage.removeItem('auth2');
    window.localStorage.removeItem(Stored.recentProjects);
    window.localStorage.removeItem(Stored.deliverDestination);
    window.localStorage.removeItem(Stored.cmdrLinkedFCs);
    window.localStorage.removeItem(Stored.hideShipTrips);
    window.localStorage.removeItem(Stored.useNativeDiscord);
  }

  async migrateLinkedFCs(): Promise<void> {
    // exit early if nothing to do..
    var json = localStorage.getItem(Stored.cmdrLinkedFCs);
    if (!json?.startsWith('[')) return;

    const marketIds = JSON.parse(json) as number[];
    const allFCs = await Promise.all(marketIds.map(marketId => api.fc.get(marketId.toString())));

    // reduce to < marketId: name >
    const mapFCs = allFCs.reduce((map, fc) => {
      map[fc.marketId.toString()] = fcFullName(fc.name, fc.displayName);
      return map;
    }, {} as Record<string, string>);

    // store migrated data
    localStorage.setItem(Stored.cmdrLinkedFCs, JSON.stringify(mapFCs));
    console.log(`migrateLinkedFCs:`, mapFCs);
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

  get cmdr(): CmdrData | undefined { return readValue(Stored.cmdr); }
  set cmdr(newValue: CmdrData | undefined) { writeValue(Stored.cmdr, newValue); }

  get apiKey(): string { return readString(Stored.apiKey); }
  set apiKey(newValue: string) { writeValue(Stored.apiKey, newValue); }

  get recentProjects(): ProjectRefLite[] { return readValue(Stored.recentProjects) ?? []; }

  addRecentProject(proj: Project): void {
    // ignore any mock projects
    if (proj.isMock) return;

    // read recent projects and remove entry for this project
    const recentProjects = this.recentProjects
      .filter(rp => rp.buildId !== proj.buildId);

    const newRef: ProjectRefLite = {
      buildId: proj.buildId,
      systemName: proj.systemName!,
      buildName: proj.buildName,
      buildType: proj.buildType,
      isPrimaryPort: proj.isPrimaryPort,
      complete: proj.complete,
    };

    // add to the array, trim if getting too long
    recentProjects.unshift(newRef);

    if (recentProjects.length > 5) {
      recentProjects.pop();
    }

    writeValue(Stored.recentProjects, recentProjects)
  }

  removeRecentProject(buildId: string): void {
    // read recent projects and remove entry for this project
    const recentProjects = this.recentProjects
      .filter(rp => rp.buildId !== buildId);

    writeValue(Stored.recentProjects, recentProjects)
  }

  get deliver(): Record<string, number> { return readValue(Stored.deliver) ?? {}; }
  set deliver(newValue: Record<string, number>) { writeValue(Stored.deliver, newValue); }

  get commoditySort(): SortMode { return readString(Stored.sortMode) as SortMode ?? SortMode.group; }
  set commoditySort(newValue: SortMode) { writeValue(Stored.sortMode, newValue); }

  get deliverDestination(): string { return readString(Stored.deliverDestination) || 'site'; }
  set deliverDestination(newValue: string) { writeValue(Stored.deliverDestination, newValue); }

  get commodityHideCompleted(): boolean { return readBoolean(Stored.hideCompleted); }
  set commodityHideCompleted(newValue: boolean) { writeValue(Stored.hideCompleted, newValue); }

  get commodityHideFCColumns(): boolean { return readBoolean(Stored.hideFC); }
  set commodityHideFCColumns(newValue: boolean) { writeValue(Stored.hideFC, newValue); }

  get primaryBuildId(): string { return readString(Stored.primaryBuildId); }
  set primaryBuildId(newValue: string) { writeValue(Stored.primaryBuildId, newValue); }

  /** Map of FC market IDs */
  get cmdrLinkedFCs(): Record<string, string> { return readValue(Stored.cmdrLinkedFCs) ?? {}; }
  set cmdrLinkedFCs(newValue: Record<string, string>) { writeValue(Stored.cmdrLinkedFCs, newValue); }

  get globalStats(): GlobalStats | undefined { return readValue(Stored.globalStats); }
  set globalStats(newValue: GlobalStats | undefined) { writeValue(Stored.globalStats, newValue); }

  get theme(): string { return readString(Stored.theme); }
  set theme(newValue: string) { writeValue(Stored.theme, newValue); }

  get hideShipTrips(): boolean { return readBoolean(Stored.hideShipTrips); }
  set hideShipTrips(newValue: boolean) { writeValue(Stored.hideShipTrips, newValue); }

  get useNativeDiscord(): boolean { return readBoolean(Stored.useNativeDiscord); }
  set useNativeDiscord(newValue: boolean) { writeValue(Stored.useNativeDiscord, newValue); }

  get useIncomplete(): boolean { return readBoolean(Stored.useIncomplete, false); }
  set useIncomplete(newValue: boolean) { writeValue(Stored.useIncomplete, newValue); }

  get findMarketsOptions(): FindMarketsOptions { return readValue(Stored.findMarketsOptions, { maxDistance: 500, maxArrival: 0, noFC: true, noSurface: false, shipSize: 'medium', requireNeed: true } as FindMarketsOptions)!; }
  set findMarketsOptions(newValue: FindMarketsOptions) { writeValue(Stored.findMarketsOptions, newValue); }

  get foundMarkets(): FoundMarkets | undefined { return readValue(Stored.foundMarkets); }
  set foundMarkets(newValue: FoundMarkets | undefined) { writeValue(Stored.foundMarkets, newValue); }

  get notAgain(): string[] { return readValue(Stored.notAgain, [])!; }
  set notAgain(newValue: string[]) { writeValue(Stored.notAgain, newValue); }

  get buildTypeGrid(): boolean { return readBoolean(Stored.buildTypeGrid, false); }
  set buildTypeGrid(newValue: boolean) { writeValue(Stored.buildTypeGrid, newValue); }

  get sysViewView(): string { return readString(Stored.sysView2View, 'body'); }
  set sysViewView(newValue: string) { writeValue(Stored.sysView2View, newValue); }

  get sysViewHideEmpties(): boolean { return readBoolean(Stored.sysViewHideEmpties); }
  set sysViewHideEmpties(newValue: boolean) { writeValue(Stored.sysViewHideEmpties, newValue); }

  get viewEditBuiltTypeTab(): string { return readString(Stored.viewEditBuiltTypeTab, 'both'); }
  set viewEditBuiltTypeTab(newValue: string) { writeValue(Stored.viewEditBuiltTypeTab, newValue); }

  get siteGraphType(): SiteGraphType { return readString(Stored.siteGraphType) as SiteGraphType || 'major'; }
  set siteGraphType(newValue: SiteGraphType) { writeValue(Stored.siteGraphType, newValue); }

  get autoCheckSpanshEconomies(): boolean { return readBoolean(Stored.autoCheckSpanshEconomies); }
  set autoCheckSpanshEconomies(newValue: boolean) { writeValue(Stored.autoCheckSpanshEconomies, newValue); }

  get archFav(): boolean { return readBoolean(Stored.archFav); }
  set archFav(newValue: boolean) { writeValue(Stored.archFav, newValue); }

  get viewAllHiddenFC(): number[] { return readValue(Stored.viewAllHiddenFC, [])!; }
  set viewAllHiddenFC(newValue: number[]) { writeValue(Stored.viewAllHiddenFC, newValue); }

  get applyBuffNerf(): boolean { return readBoolean(Stored.applyBuffNerf, true); }
  set applyBuffNerf(newValue: boolean) { writeValue(Stored.applyBuffNerf, newValue); }

  get recentID64(): NameID64[] { return readValue(Stored.recentID64, [])!; }
  set recentID64(newValue: NameID64[]) { writeValue(Stored.recentID64, newValue); }
}

interface NameID64 {
  name: string;
  id64: number;
}
export const store = new LocalStorage();