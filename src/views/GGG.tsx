import * as api from '../api';
import { ActionButton, Callout, DirectionalHint, Icon, IconButton, mergeStyles, Panel, PanelType, PrimaryButton, Spinner, Stack } from '@fluentui/react';
import { Link2 } from '../components/LinkSrvSurvey';
import { appTheme, cn } from '../theme';
import { Component } from 'react';
import { GGGRow } from '../api/misc';
import { isMobile } from '../util';
import { CopyButton } from '../components/CopyButton';

const css = mergeStyles({
  cursor: 'default',
  '.top h2': {
    color: appTheme.palette.accent,
  },
  '.ms-Button--action': {
    height: 24,
  },
  'tbody tr': {
    ':hover': {
      backgroundColor: appTheme.palette.themeLight,
    }
  },
  'tbody td': {
    paddingTop: 2,
    paddingBottom: 2,
  },
  '.tableBodies': {
    fontSize: 14,
    textTransform: 'capitalize',
    marginTop: 20,
    'tr th': {
      textAlign: 'left',
      paddingRight: 8,
      borderBottom: '1px solid ' + appTheme.palette.purpleDark,
    },
    'td': {
      paddingRight: '16px',
    },
    '.temp': {
      textAlign: 'right',
    },
    '.json': {
      textAlign: 'left',
      paddingLeft: 10,
      '.ms-Button--icon': {
        width: 24,
        height: 24,
      },
    },
  },
  '.tableScan': {
    '.scanKey': {
      color: appTheme.palette.themePrimary,
      paddingRight: 10,
    }
  },
  'th.sortable': {
    paddingLeft: 2,
    cursor: 'pointer',
    ":hover": {
      color: appTheme.palette.themePrimary,
      backgroundColor: appTheme.palette.themeLight,
    }
  },
});

interface GGGListRow extends Omit<GGGRow, 'journalJson'> {
  planetClass: string;
  journalJsons: JournalJson[];
}

interface JournalJson {
  BodyName: string;
  PlanetClass: string;
  Timestamp: string;
}

type SortField = 'bodyName' | 'planetClass' | 'surfaceTemp' | 'tag' | 'cmdr' | 'timeScan';

interface GGGProps { }

interface GGGState {
  gggData: GGGListRow[];
  journalJson?: JournalJson;
  showSrvHelp?: boolean;
  sortField: string;
  sortInvert: boolean;
  mapWindow: WindowProxy | null;
}

export class GGG extends Component<GGGProps, GGGState> {
  constructor(props: GGGProps) {
    super(props);
    this.state = {
      gggData: [],
      sortField: 'bodyName',
      sortInvert: false,
      mapWindow: null,
    };
  }

  componentDidMount(): void {
    window.document.title = `Green Gas Giants`;
    window.addEventListener('message', this.messageListener);
    this.loadData();
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.messageListener);
  }

  componentDidUpdate(prevProps: Readonly<GGGProps>, prevState: Readonly<GGGState>, snapshot?: any): void {
    const { mapWindow } = this.state;

    if (prevState.mapWindow !== mapWindow && mapWindow !== null) {
      this.postMapData();
    }
  }

  messageListener = (ev: MessageEvent) => {
    if (ev.data.ready === 'host') {
      //console.log(`!map!`, ev.data);
      this.postMapData();
    }
  }

  postMapData() {
    const { gggData, mapWindow } = this.state;
    if (!mapWindow || !gggData.length) { return; }

    const systems = gggData.map(d => {
      const infos = `<table>
<tr><td>Body:</td><td>${d.bodyName}</td></tr>
<tr><td>Tag:</td><td>${d.tag}</div></tr>
<tr><td>Surface temp:</td><td>${d.surfaceTemp} K</td></tr>
<tr><td>Planet class:</td><td>${d.planetClass}</td></tr>
<tr><td>Cmdr(s):</td><td>${d.cmdr}</td></tr>
</table>`;
      return {
        name: d.systemName,
        coords: { x: d.starPos[0], y: d.starPos[1], z: d.starPos[2] },
        cat: [mapTagMapCat[d.tag]],
        infos: infos,
      };
    });

    const msg = {
      source: 'opener',
      init: {
        effectScaleSystem: [1000, 10000],
        playerPos: [0, 4000, -1000],
        cameraPos: [0, 10000, -24000],
      },
      mapData: {
        categories: {
          'Tag:': {
            '0': { name: "Likely", color: mapTagColor['likely'].substring(1) },
            '1': { name: "Likely-approx", color: mapTagColor['likely-approx'].substring(1) },
            '2': { name: "Potential", color: mapTagColor['potential'].substring(1) },
            '3': { name: "Potential-approx", color: mapTagColor['potential-approx'].substring(1) },
          },
        },
        systems: systems,
      },
    };

    mapWindow.postMessage(msg);
  }

  loadData() {
    api.misc.ggg().then(result => {
      // reduce extra rows onto the first
      const map = result.reduce((m, r) => {
        const jj = {
          Commander: r.cmdr,
          Timestamp: '',
          ...JSON.parse(r.journalJson)
        };
        jj.Timestamp = jj.timestamp;
        delete jj.timestamp;
        if (!m[r.bodyName]) {
          m[r.bodyName] = { ...r, planetClass: jj.PlanetClass, journalJsons: [jj] };
        } else {
          m[r.bodyName].journalJsons.push(jj);
          m[r.bodyName].cmdr = Array.from(new Set([...m[r.bodyName].cmdr.split(', '), r.cmdr])).join(', ');
        }
        return m;
      }, {} as Record<string, GGGListRow>);

      this.setState({ gggData: sortBy(Object.values(map), 'bodyName', false) });
    });
  }

  render() {
    const { gggData, sortField, sortInvert, showSrvHelp, journalJson } = this.state;

    const renderColumn = (text: string, by: SortField | undefined) => {
      return <th className={by ? 'sortable' : undefined} onClick={() => {
        if (sortField === by) {
          this.setState({ sortInvert: !sortInvert, gggData: sortBy(gggData, sortField, !sortInvert) });
        } else if (by) {
          this.setState({ sortField: by, gggData: sortBy(gggData, by, sortInvert) });
        }
      }}>
        <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
          {!!by && <Icon
            iconName={sortField !== by ? 'CalculatorSubtract' : sortInvert ? 'CaretSolidUp' : 'CaretSolidDown'}
            style={{ color: sortField !== by ? 'grey' : appTheme.palette.themePrimary }}
          />}
          <span>{text}</span>
        </Stack>
      </th>;
    };

    return <div className={css} style={{ width: 'fit-content', margin: 10, }
    }>
      <div className='top'>
        <h2 className={cn.h3}>Green Gas Giants</h2>
        <div style={{ fontSize: 14, position: 'relative' }}>
          <PrimaryButton
            iconProps={{ iconName: 'Globe' }}
            text='Map'
            style={{ float: 'right' }}
            onClick={() => {
              const mapWindow = window.open('/#map', 'ravenMap');
              this.setState({ mapWindow });
            }}
          />
          <div>Green gas giants are incredibly rare. Cmdr Arcanic has catalogged all known GGGs at <Link2 href='https://ed-ggg.github.io/edggg/' text='https://ed-ggg.github.io/edggg/' /></div>
          <div style={{ marginBottom: 20 }}>Learn more about them by watching <Link2 href='https://youtu.be/hVS-S6FEJj4' text="Arcanic's video: Strange Temperatures" /> or see <Link2 href='https://forums.frontier.co.uk/threads/marxs-guide-to-green-gas-giants.618994/' text="Marx's guide to Green Gas Giants" /></div>

          <Stack horizontal verticalAlign='center'>
            <div>SrvSurvey has a feature</div>
            <IconButton
              id='help-enable'
              className={cn.bBox}
              iconProps={{ iconName: 'Unknown', style: { fontSize: 16 } }}
              style={{ margin: 4, width: 22, height: 22 }}
              // text='Enable feature?'
              onClick={() => this.setState({ showSrvHelp: !showSrvHelp })}
            />
            <div>to help detect green gas giants, to date logging {gggData?.length ?? '?'} bodies with suitable characteristics:</div>
          </Stack>
        </div>

        {showSrvHelp && <Callout
          target='#help-enable'
          directionalHint={DirectionalHint.rightCenter}
          styles={{
            beak: { backgroundColor: appTheme.palette.themeTertiary, },
            calloutMain: {
              backgroundColor: appTheme.palette.themeTertiary,
              color: appTheme.palette.neutralDark,
            }
          }}
          onDismiss={() => setTimeout(() => this.setState({ showSrvHelp: false }), 0)}
        >
          <div>To enable SrvSurvey's GGG detection feature:</div>
          <ul style={{}}>
            <li>Open SrvSurvey settings</li>
            <li>Select tab: More</li>
            <li>Check "Upload GGG candidates"</li>
          </ul>
        </Callout>}
      </div>

      <div style={{ marginTop: 20 }}>
        {!gggData && <Spinner labelPosition='right' label='Loading ...' style={{ marginTop: 20 }} />}

        {!!gggData && <table className='tableBodies' cellSpacing={0} cellPadding={0}>
          <thead>
            <tr>
              {renderColumn('Body', 'bodyName')}
              {renderColumn('Planet Class', 'planetClass')}
              {renderColumn('Temperature', 'surfaceTemp')}
              {renderColumn('Tagged', 'tag')}
              {renderColumn('First scanned', 'timeScan')}
              {renderColumn('Commander', 'cmdr')}
              {renderColumn('Journal Scan', undefined)}
            </tr>
          </thead>

          <tbody>
            {gggData.map((row, index) => {
              return <tr key={index} style={{ backgroundColor: index % 2 ? appTheme.palette.themeLighter : undefined }}>
                <td className='name'>
                  <CopyButton text={row.bodyName} fontSize={12} color={appTheme.palette.themeSecondary} />&nbsp;{row.bodyName}
                </td>
                <td>{row.planetClass}</td>
                <td className='temp'>{row.surfaceTemp} K</td>
                <td>
                  <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
                    <Icon iconName={mapTagIcon[row.tag]} style={{ color: mapTagColor[row.tag] }} />
                    <div>{row.tag}</div>
                  </Stack>
                </td>
                <td>{new Date(row.timeScan).toLocaleDateString()}</td>
                <td>{row.cmdr}</td>
                <td className='json'>
                  {row.journalJsons.map(jj => <IconButton
                    key={`jjb-${jj.BodyName}-${jj.Timestamp}`}
                    id={`row-${jj.BodyName}-${jj.Timestamp}`}
                    className={cn.bBox}
                    iconProps={{ iconName: 'TextDocument' }}
                    onClick={() => this.setState({ journalJson: journalJson === jj ? undefined : jj })}
                  />)}
                </td>
              </tr>;
            })}
          </tbody>
        </table>}
      </div>

      {!!journalJson && <>
        <Panel
          className={css}
          isOpen
          allowTouchBodyScroll={isMobile()}
          type={PanelType.medium}
          customWidth={'380px'}
          headerText={`Journal Scan: ${journalJson.BodyName}`}
          isLightDismiss
          styles={{
            overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
            footerInner: { padding: 4 }
          }}
          isFooterAtBottom
          onRenderFooterContent={() => {
            return <>
              <ActionButton
                className={cn.bBox}
                iconProps={{ iconName: 'Copy' }}
                text='Copy JSON'
                onClick={() => navigator.clipboard.writeText(JSON.stringify(journalJson))}
              />
            </>;
          }}
          onDismiss={(ev: any) => {
            // if the mouse is over a button showing json for another body ... try clicking it
            if (ev.type === 'click') {
              setTimeout(() => {
                let btn = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement;
                while (!!btn?.parentElement && btn.tagName !== 'BUTTON') { btn = btn.parentElement; }

                if (btn?.id.startsWith('row-') && btn.id !== `row-${journalJson.BodyName}-${journalJson.Timestamp}`) {
                  btn.click();
                }
              }, 10);
            }
            // but close the panel first
            this.setState({ journalJson: undefined });
          }}
        >
          <div>
            <table className='tableScan' cellSpacing={0}>
              <tbody>
                {Object.entries(journalJson).map(([key, value]) => {
                  const val = typeof value === 'object'
                    ? JSON.stringify(value, null, 2)
                    : value?.toString() || <span style={{ color: 'grey' }}>(blank)</span>;

                  return <tr key={key}>
                    <td className='scanKey'>{key}</td>
                    <td><code>{val}</code></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </>}
    </div>;
  }
}

const sortBy = (gggData: GGGListRow[], by: SortField, invert: boolean) => {
  const sorted = gggData?.sort((a, b) => {
    switch (by) {
      case 'bodyName': return a.bodyName.localeCompare(b.bodyName) * (invert ? -1 : 1);
      case 'planetClass': return a.planetClass.localeCompare(b.planetClass) * (invert ? -1 : 1);
      case 'surfaceTemp': return (a.surfaceTemp - b.surfaceTemp) * (invert ? -1 : 1);
      case 'tag': return a.tag.localeCompare(b.tag) * (invert ? -1 : 1);
      case 'cmdr': return a.cmdr.localeCompare(b.cmdr) * (invert ? -1 : 1);
      case 'timeScan': return a.timeScan.localeCompare(b.timeScan) * (invert ? -1 : 1);
      default: throw new Error(`Unexpected sortField: ${by}`);
    }
  });
  return sorted;
};


const mapTagIcon: Record<string, string> = {
  'likely': 'SkypeCircleCheck',
  'likely-approx': 'SkypeCircleSlash',
  'potential': 'Location',
  'potential-approx': 'StatusCircleRing',
}

const mapTagMapCat: Record<string, number> = {
  'likely': 0,
  'likely-approx': 1,
  'potential': 2,
  'potential-approx': 3,
}

const mapTagColor: Record<string, string> = {
  'likely': '#11cc00',
  'likely-approx': '#999900',
  'potential': '#00aa99',
  'potential-approx': '#005c53',
}
