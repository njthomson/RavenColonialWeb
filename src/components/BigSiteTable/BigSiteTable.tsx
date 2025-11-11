import './BigSiteTable.css';
import { IContextualMenuItem, ContextualMenuItemType, ContextualMenu, ActionButton, Icon, Stack, IconButton, Panel, PanelType, DirectionalHint } from "@fluentui/react";
import { Component, FunctionComponent, useState } from "react";
import { averageHauls, getSiteType, mapName, SiteType, siteTypes, sysEffects, SysEffects } from "../../site-data";
import { appTheme, cn } from "../../theme";
import { asPosNegTxt, isMobile } from "../../util";
import { SysMap } from "../../system-model";
import { CalloutMsg } from "../CalloutMsg";
import { Chevrons } from "../Chevrons";
import { EconomyBlock } from "../EconomyBlock";
import { PadSize } from "../PadSize";
import { TierPoint } from "../TierPoints";
import { BuildEffects } from '../BuildEffects';
import { SiteImage } from '../VisualIdentify';
import { isTypeValid2, SysMap2 } from '../../system-model2';


export const BigSiteTablePage: FunctionComponent<{ foo?: string }> = (props) => {
  const [targetBuildType, setTargetBuildType] = useState('');

  return <div>
    <BigSiteTable
      buildType={undefined}
      onChange={newValue => {
        setTargetBuildType(newValue);
      }}
    />
    {targetBuildType && <>
      <Panel
        isOpen
        isLightDismiss
        headerText={targetBuildType}
        allowTouchBodyScroll={isMobile()}
        type={PanelType.medium}
        styles={{
          header: { textTransform: 'capitalize', cursor: 'default' },
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40, cursor: 'default' },
        }}
        onDismiss={(ev: any) => {
          // if the mouse is over a button for another build-type ... try clicking it
          if (ev.type === 'click') {
            setTimeout(() => {
              let btn = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement;
              while (!!btn?.parentElement && btn.tagName !== 'BUTTON') {
                btn = btn.parentElement;
              }

              if (btn?.id.startsWith('st-') && !btn.id.endsWith(targetBuildType)) {
                btn.click();
              }
            }, 10);
          }

          // but close the panel first
          setTargetBuildType('');
        }}
      >
        <div style={{ cursor: 'default' }}>
          <h1 style={{ margin: 0, color: appTheme.palette.themePrimary }}>{getSiteType(targetBuildType)?.displayName2}</h1>

          <div style={{ margin: '10px 0' }}>
            <SiteImage buildType={targetBuildType} width={600} height={400} />
          </div>

          <BuildEffects buildType={targetBuildType} noType heading='Build details:' />
        </div>
      </Panel>
    </>}
  </div>;
}

interface BigSiteTableProps {
  buildType: string | undefined,
  sysMap?: SysMap;
  sysMap2?: SysMap2;
  onChange: (value: string) => void
  tableOnly?: boolean;
  stickyTop?: number;
  allowPartial?: boolean;
}

interface BigSiteTableState {
  selection: string | undefined;
  filterColumns: Set<string>;
  headerContextKey?: string;
  headerContextOptions: string[]
}

export class BigSiteTable extends Component<BigSiteTableProps, BigSiteTableState> {

  constructor(props: BigSiteTableProps) {
    super(props);

    this.state = {
      selection: props.buildType,
      filterColumns: new Set<string>(),
      headerContextOptions: [],
    };
  }

  sortFilterLarge() {
    const { filterColumns } = this.state;

    const sorted = siteTypes
      .filter(t => t.tier > 0) // remove unknown types
      .filter(t => {
        // filter any of the effects
        for (const key in t.effects) {
          if (filterColumns.has(key) && (t.effects[key as keyof SysEffects] ?? 0) <= 0) {
            return false;
          }
        }
        const showValid = this.props.sysMap || this.props.sysMap2;
        const { isValid } = isTypeValid2(this.props.sysMap2, t, getSiteType(this.props.buildType!, true));
        if (filterColumns.has('valid') && showValid && !filterColumns.has(`valid:${isValid}`)) { return false; }
        if (filterColumns.has('tier') && !filterColumns.has(`tier${t.tier}`)) { return false; }
        if (filterColumns.has('env') && !filterColumns.has(t.orbital ? 'orbital' : 'planetary')) { return false; }
        if (filterColumns.has('needs') && !filterColumns.has(`needT${t.needs.tier}`)) { return false; }
        if (filterColumns.has('gives') && !filterColumns.has(`giveT${t.gives.tier}`)) { return false; }
        if (filterColumns.has('inf') && !filterColumns.has(t.inf)) { return false; }
        if (filterColumns.has('pad')) {
          if (t.padMap) {
            // check any padMap entry
            if (!Object.values(t.padMap).some(sz => filterColumns.has(`pad:${sz}`))) { return false; }
          } else {
            // compare against the default size
            if (!filterColumns.has(`pad:${t.padSize}`)) { return false; }
          }
        }

        return true;
      });
    return sorted;
  }

  render() {
    return <div className='bst'>
      <Stack horizontal verticalAlign='baseline'>
        {this.renderFilterText()}
      </Stack>

      {this.renderTable()}
    </div>;
  }

  renderTable() {
    const { headerContextKey, headerContextOptions, filterColumns } = this.state;

    const sorted = this.sortFilterLarge();

    const rows: JSX.Element[] = [];
    let flip = false;
    for (const t of sorted) {
      flip = !flip;
      rows.push(this.renderLargeRow(t, flip));
    }

    const menuItems: IContextualMenuItem[] = [
      ...headerContextOptions.map(t => ({
        key: `tbh-${headerContextKey}-${t}`,
        text: mapName[t],
        canCheck: true,
        checked: filterColumns.has(t),
        onClick: () => {
          if (!this.state.headerContextKey) return;

          if (filterColumns.has(t)) {
            // remove both entries
            filterColumns.delete(t);
            //filterColumns.delete(this.state.headerContextKey!);
            if (!headerContextOptions.some(o => filterColumns.has(o))) {
              filterColumns.delete(this.state.headerContextKey);
            }

          } else {
            // remove any other option and add choosen one
            // headerContextOptions.forEach(o => filterColumns.delete(o));
            filterColumns.add(t);
            filterColumns.add(this.state.headerContextKey);
          }
          this.setState({ filterColumns });
        },
        onRenderContent(props, defaultRenders) {
          return <>
            {defaultRenders.renderCheckMarkIcon(props)}
            {/* {defaultRenders.renderItemIcon(props)} */}
            <EconomyBlock economy={t} size='10px' />
            {defaultRenders.renderItemName(props)}
          </>;
        },
      } as IContextualMenuItem)),
      { key: 'divider_1', itemType: ContextualMenuItemType.Divider, },
      {
        key: 'toggle-ready',
        checked: false,
        text: 'Clear all',
        onClick: () => {
          if (this.state.headerContextKey) {
            filterColumns.delete(this.state.headerContextKey);
            headerContextOptions.forEach(o => filterColumns.delete(o));
          }
        },
      }
    ];

    const showValid = this.props.sysMap || this.props.sysMap2;
    return <div className='build-type'>
      {headerContextKey && <>
        <ContextualMenu
          target={`#bth-${headerContextKey}`}

          onDismiss={() => this.setState({ headerContextKey: undefined })}
          items={menuItems}
          styles={{
            container: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, }
          }}
        />
      </>}

      <table cellPadding={0} cellSpacing={0} style={{ marginBottom: 24 }}>
        <colgroup>
          <col width='250px' />{/* buildType */}
          <col width='15px' />{/* i */}
          {/* <col width='66px' /> */}
          {showValid && <col width='68px' />}{/* valid */}
          <col width='44px' />{/* haul */}
          <col width='60px' />{/* pad */}
          <col width='95px' />{/* env */}
          <col width='80px' />{/* tier */}
          <col width='80px' />{/* needs */}
          <col width='80px' />{/* gives */}
          <col width='130px' />{/* inf */}
          <col width='75px' />{/* pop */}
          <col width='75px' />{/* mpop */}
          <col width='90px' />{/* sec */}
          <col width='85px' />{/* wealth */}
          <col width='75px' />{/* tech */}
          <col width='75px' />{/* sol */}
          <col width='75px' />{/* dev */}
          <col width='80px' />{/* score */}
        </colgroup>

        <thead>
          <tr style={{
            backgroundColor: appTheme.palette.white,
            position: 'sticky', zIndex: 1, top: this.props.stickyTop ?? 0,
          }}
          >
            {this.renderLargeColumnHeader('buildType', `${cn.bb}`)}
            <th className={`${cn.bb} ${cn.br}`}></th>
            {/* {this.renderLargeColumnHeader('layouts', `${cn.bb} ${cn.br}`)} */}
            {showValid && this.renderLargeColumnHeader('valid', `cc ${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('haul', `cc ${cn.bb} ${cn.br}`)}
            {this.renderLargeColumnHeader('pad', `cc ${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('env', `cc ${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('tier', `${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('needs', `${cn.bb} ${cn.br}`)}
            {this.renderLargeColumnHeader('gives', `${cn.bb} ${cn.br}`)}
            {this.renderLargeColumnHeader('inf', `${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('pop', `${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('mpop', `${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('sec', `${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('wealth', `${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('tech', `${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('sol', `${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('dev', `${cn.bb} ${cn.br} ${cn.trh} btn`)}
            {this.renderLargeColumnHeader('score', `${cn.bb} ${cn.trh} btn`)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr>
            <td colSpan={14} className='cc' style={{ padding: 20, color: 'grey' }}>
              No types meet current filters.
            </td>
          </tr>}

          {rows}
        </tbody>
      </table>
    </div>;
  }

  renderFilterText() {
    const { filterColumns } = this.state;

    let parts: string[] = [];

    if (filterColumns.has('valid')) {
      if (filterColumns.has('valid:true')) {
        parts.push(`Valid`)
      } else if (filterColumns.has('valid:false')) {
        parts.push(`Not valid`)
      }
    }

    if (filterColumns.has('pad')) {
      if (filterColumns.has('pad:large')) {
        parts.push(`Large pads`)
      } else if (filterColumns.has('pad:medium')) {
        parts.push(`Medium pads`)
      } else if (filterColumns.has('pad:small')) {
        parts.push(`Small pads`)
      } else if (filterColumns.has('pad:none')) {
        parts.push(`No pads`)
      }
    }

    if (filterColumns.has('env')) {
      if (filterColumns.has('orbital')) {
        parts.push(`Orbital`)
      } else if (filterColumns.has('planetary')) {
        parts.push(`Planetary`)
      }
    }

    if (filterColumns.has('tier')) {
      if (filterColumns.has('tier1')) {
        parts.push(`Tier 1`)
      } else if (filterColumns.has('tier2')) {
        parts.push(`Tier 2`)
      } else if (filterColumns.has('tier3')) {
        parts.push(`Tier 3`)
      }
    }

    if (filterColumns.has('needs')) {
      if (filterColumns.has('needT2')) {
        parts.push(`Needs T2 Points`)
      } else if (filterColumns.has('needT3')) {
        parts.push(`Needs T3 Points`)
      }
    }

    if (filterColumns.has('gives')) {
      if (filterColumns.has('giveT2')) {
        parts.push(`Gives T2 Points`)
      } else if (filterColumns.has('giveT3')) {
        parts.push(`Gives T3 Points`)
      }
    }

    if (filterColumns.has('inf')) {
      var txt = infEconomies
        .filter(inf => filterColumns.has(inf))
        .map(inf => mapName[inf])
        .join('/');
      parts.push(`Economy: ${txt}`);
    }

    for (const key of sysEffects) {
      if (filterColumns.has(key)) {
        parts.push(mapName[key]);
      }
    }

    return <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 0 }}
      style={{
        padding: 8,
        color: appTheme.palette.yellowDark
      }}>
      <div>Filter:&nbsp;</div>
      {parts.length > 0 && <>
        {parts.join(', ')}

        <IconButton
          iconProps={{
            iconName: 'Delete',
            style: { fontSize: 14 }
          }}
          style={{ width: 20, height: 16 }}
          onClick={() => {
            filterColumns.clear();
            this.setState({ filterColumns });
          }}
        />
      </>}
      {parts.length === 0 && <div>None <span style={{ fontSize: 10, color: 'grey' }}>click columns to filter</span></div>}
    </Stack>;
  }

  renderLargeColumnHeader(name: string, className: string) {
    const { filterColumns } = this.state;

    const canFilter = className.includes('btn');
    const isFilter = filterColumns.has(name);

    return <th
      className={className}
      style={{
        color: isFilter ? appTheme.palette.yellowDark : undefined
      }}
      onClick={() => {
        if (!className.includes('btn')) return;
        if (this.state.headerContextKey) {
          this.setState({ headerContextKey: undefined });
          return;
        }


        if (name in mapCyclicFilters) {
          if (!filterColumns.has(name)) {
            filterColumns.add(name);
            filterColumns.add(mapCyclicFilters[name][0]);
          } else {
            mapCyclicFilters[name].every((cf, i) => {
              if (filterColumns.has(cf)) {
                filterColumns.delete(cf);
                const next = mapCyclicFilters[name][i + 1];
                if (next) {
                  filterColumns.add(next);
                  return false;
                } else {
                  filterColumns.delete(name);
                }
              }
              return true;
            });
          }
        }

        else if (name === 'inf') {
          this.setState({
            headerContextKey: 'inf',
            headerContextOptions: infEconomies,
          });
        }

        else if (isFilter) {
          filterColumns.delete(name);
        } else {
          filterColumns.add(name);
        }
        this.setState({ filterColumns });
      }}
    >
      <span id={`bth-${name}`} style={{ marginRight: 2 }} title={mapColumnTitle[name]}>{mapColumnNames[name]}</span>
      {isFilter && <Icon iconName='Filter' />}
      {!isFilter && canFilter && <div className='not-filter' />}
    </th>;
  }

  renderLargeRow(type: SiteType, flip: boolean) {
    const { selection, filterColumns } = this.state;

    // const greyDash = <span style={{ color: 'grey' }}>-</span>;
    const showValid = this.props.sysMap || this.props.sysMap2;
    const { isValid, msg, unlocks } = isTypeValid2(this.props.sysMap2, type, getSiteType(this.props.buildType!, true));
    console.log(`${type.displayName2} => ${isValid} / ${msg}`);

    const isCurrentSelection = selection && (type.subTypes.includes(selection) || type.altTypes?.includes(selection) || selection === type.subTypes[0] + '?');

    let padSize = type.padSize;
    let subTypes = type.subTypes;
    // adjust these if we have a padMap
    if (type.padMap && filterColumns.has('pad')) {
      for (const sz of ['small', 'medium', 'large']) {
        if (filterColumns.has(`pad:${sz}`)) {
          padSize = sz as any;
          subTypes = Object.keys(type.padMap).filter(bt => type.padMap && type.padMap[bt] === sz)
        }
      }
    }

    // use measured size, but defer to static size if not known
    const haulSize = averageHauls[type.displayName2] ?? type.haul;

    return <tr
      key={`btr${type.subTypes}1`}
      className={`${cn.trhi}`}
      style={{ backgroundColor: flip ? appTheme.palette.neutralLighter : undefined }}
    >

      <td
        className={`cl`}
        style={{
          borderLeft: isCurrentSelection ? `8px solid ${appTheme.palette.accent}` : undefined,
          fontWeight: isCurrentSelection ? 'bold' : undefined,
        }}
        onClick={ev => {
          // allow a partial selection?
          if (this.props.allowPartial && !ev.isDefaultPrevented()) {
            if (type.subTypes.length === 1) {
              // nothing ambiguous is there is only 1 subType
              this.props.onChange(type.subTypes[0]);
            } else {
              this.props.onChange(type.subTypes[0] + '?');
            }
          }
        }}
      >
        <div>{type.displayName2}</div>

        <Stack horizontal wrap tokens={{ childrenGap: 0 }} style={{ marginLeft: 8, fontSize: 12 }}>
          {subTypes.map((st, i) => {
            const isSelected = selection === st
              || (i === 0 && type.altTypes?.includes(selection!));

            return <ActionButton
              key={`st-${st}`}
              id={`st-${st}`}
              style={{
                color: isSelected ? appTheme.palette.black : undefined,
                backgroundColor: isSelected ? appTheme.palette.neutralLighter : undefined,
                // fontWeight: isSelected ? 'bold' : undefined,
                fontSize: 12,
                height: 16,
                padding: '0 0 2px 0',
                margin: 1,
                border: `1px solid ${isSelected ? appTheme.palette.themePrimary : 'grey'}`,

              }}
              onClick={ev => {
                ev.preventDefault();
                this.props.onChange(st);
              }}
            >
              {st.replace('_i', '').replace('_e', '')}
            </ActionButton>;
          })}
        </Stack>
      </td>

      <td className={`${cn.br}`}>
        {this.renderPreReq(isValid, msg, unlocks)}
      </td>

      {showValid && <td className={`${cn.br}`}>{this.renderValid(isValid)}</td>}

      <td className={`${cn.br}`}><HaulSize haul={haulSize} /></td>

      <td className={`${cn.br}`}><PadSize size={padSize} /></td>

      <td className={`${cn.br}`}>
        <Icon iconName={type.orbital ? 'ProgressRingDots' : 'GlobeFavorite'} />
      </td>

      <td className={`${cn.br}`}>
        {type.tier}
      </td>

      <td className={`${cn.br}`}><TierPoint tier={type.needs.tier} count={type.needs.count} /></td>
      <td className={`${cn.br}`}><TierPoint tier={type.gives.tier} count={type.gives.count} /></td>

      <td className={`cl ${cn.br}`}>
        {type.inf !== 'none' && <Stack horizontal verticalAlign='center'>
          <EconomyBlock economy={type.inf} size='10px' />
          &nbsp;
          {mapName[type.inf]}
        </Stack>}
      </td>

      <td className={`${cn.br}`}><Chevrons name='pop' count={type.effects.pop} title={`Population: ${asPosNegTxt(type.effects.pop!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='mpop' count={type.effects.mpop} title={`Max Population: ${asPosNegTxt(type.effects.mpop!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='sec' count={type.effects.sec} title={`Security: ${asPosNegTxt(type.effects.sec!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='wealth' count={type.effects.wealth} title={`Wealth: ${asPosNegTxt(type.effects.wealth!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='tech' count={type.effects.tech} title={`Tech level: ${asPosNegTxt(type.effects.tech!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='sol' count={type.effects.sol} title={`Standard of Living: ${asPosNegTxt(type.effects.sol!)}`} /></td>
      <td className={`${cn.br}`}><Chevrons name='dev' count={type.effects.dev} title={`Development level: ${asPosNegTxt(type.effects.dev!)}`} /></td>
      <td style={{ borderRight: isCurrentSelection ? `8px solid ${appTheme.palette.accent}` : undefined }}>+{type.score}</td>
    </tr>;
  }

  renderPreReq(isValid: boolean, msg: string | undefined, unlocks: string[] | undefined) {
    if (!msg && !unlocks) {
      return <div style={{ width: 15 }} />
    }

    const msgElement = <div>
      {msg && <Stack horizontal verticalAlign='center'>
        <Icon iconName={isValid ? 'Accept' : 'ChromeClose'} style={{ marginRight: 4, fontWeight: 'bolder', color: isValid ? appTheme.palette.greenLight : appTheme.palette.red }} />
        <span>{msg}</span>
      </Stack>}
      {unlocks && <>
        {unlocks.map(t => {
          return <div>
            <Icon iconName={t.startsWith('System') ? 'UnlockSolid' : 'Unlock'} style={{ marginRight: 4, }} />
            {t}
          </div>;
        })}
      </>}
    </div>;

    return <CalloutMsg
      directionalHint={DirectionalHint.rightCenter}
      msg={msgElement}
      iconName={!isValid ? 'Warning' : undefined}
      width={22}
      height={22}
      iconStyle={{
        fontWeight: !isValid ? 'bold' : undefined,
        color: !isValid ? appTheme.palette.yellowDark : appTheme.palette.black,
      }}
    />;
  }

  renderValid(isValid: boolean) {
    if (isValid) {
      return <Icon iconName='SkypeCheck' style={{ color: appTheme.palette.greenLight }} />;
    } else {
      return <Icon iconName='Cancel' style={{ color: appTheme.palette.red, fontWeight: 'bold' }} />;
    }
  }
}

const mapColumnNames: Record<string, string> = {
  buildType: 'Type',
  layouts: 'Layouts',
  valid: 'Valid',
  haul: 'Haul',
  pad: 'Pad',
  env: 'Location',
  tier: 'Tier',
  needs: 'Needs',
  gives: 'Gives',
  inf: 'Economy Inf',
  pop: 'Pop',
  mpop: 'MPop',
  sec: 'Security',
  wealth: 'Wealth',
  tech: 'Tech',
  sol: 'SoL',
  dev: 'Dev',
  score: 'Score',
}

const mapColumnTitle: Record<string, string> = {
  buildType: `The overall type of a project. You must choose one of the sub-types`,
  valid: `If the system has enough tier points and all pre-req's are build`,
  haul: `Approximately how much cargo needs to be delivered
Grouped by:
    < ${(4_000).toLocaleString()} : Lime
    < ${(8_000).toLocaleString()} : Green
  < ${(20_000).toLocaleString()} : Yellow
  < ${(50_000).toLocaleString()} : Orange
< ${(200_000).toLocaleString()} : Red
> ${(200_000).toLocaleString()} : Dark red
 `,
  pad: `The largest landing pad once build`,
  env: `The location: orbital or planetary.
Click to filter:
  - Orbital
  - Planetary
  - None`,
  tier: `Click to filter:
  - Tier 1
  - Tier 2
  - Tier 3
  - None`,
  needs: `How many tier points are needed to build this project.
Use Tier to filter.`,
  gives: `How many tier points are given by this project once complete.
Use Tier to filter.`,
  inf: `The economic influence this project has. Click to filter`,
  pop: `Changes to system population once complete. Click to filter`,
  mpop: `Changes to system max population once complete. Click to filter`,
  sec: `Changes to system security once complete.
Click to filter positive impacts.`,
  wealth: `Changes to system wealth once complete. Click to filter`,
  tech: `Changes to system tech level once complete. Click to filter`,
  sol: `Changes to system standard of living once complete.
Click to filter positive impacts.`,
  dev: `Changes to system development level once complete. Click to filter`,
  score: `Score contributed to system score once complete.`,
}

const mapCyclicFilters: Record<string, string[]> = {
  'valid': ['valid:true', 'valid:false'],
  'pad': ['pad:none', 'pad:large', 'pad:medium', 'pad:small'],
  'tier': ['tier1', 'tier2', 'tier3'],
  'env': ['orbital', 'planetary'],
  'needs': ['needT2', 'needT3'],
  'gives': ['giveT2', 'giveT3'],
};

const infEconomies = [
  'agriculture',
  'colony',
  'extraction',
  'hightech',
  'industrial',
  'military',
  'refinery',
  'service',
  'tourism',
];

export const HaulSize: FunctionComponent<{ haul: number, size?: number, dim?: boolean }> = (props) => {
  const { haul } = props;

  const dark = appTheme.isInverted
    ? 'rgb(48, 48, 48)'
    : 'rgb(200, 200, 200)';

  // start large
  let w = 4;
  let h = 4;
  let g = 5;
  if (props.size === 1) { // small
    w = 2;
    h = 2;
    g = 3;
  } else if (props.size === 2) { // medium
    w = 3;
    h = 3;
    g = 4;
  }

  return <div
    title={`~${haul.toLocaleString()} units`}
    style={{
      display: 'inline-block',
      position: 'relative',
      width: g * 6,
      height: 1 + h * 6,
      overflow: 'hidden',
      marginLeft: 8,
      marginBottom: 2,
    }}
  >
    <div style={{ position: 'absolute', left: g * 0, bottom: 0, width: w, height: h * 1, backgroundColor: 'lime', }} />
    <div style={{ position: 'absolute', left: g * 1, bottom: 0, width: w, height: h * 2, backgroundColor: haul >= 4_000 ? 'lightgreen' : dark, }} />
    <div style={{ position: 'absolute', left: g * 2, bottom: 0, width: w, height: h * 3, backgroundColor: haul >= 8_000 ? 'yellow' : dark }} />
    <div style={{ position: 'absolute', left: g * 3, bottom: 0, width: w, height: h * 4, backgroundColor: haul >= 20_000 ? 'orange' : dark }} />
    <div style={{ position: 'absolute', left: g * 4, bottom: 0, width: w, height: h * 5, backgroundColor: haul >= 50_000 ? 'red' : dark }} />
    <div style={{ position: 'absolute', left: g * 5, bottom: 0, width: w, height: h * 6, backgroundColor: haul >= 200_000 ? 'darkred' : dark }} />

    {props.dim && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)' }} />}
  </div>;
}