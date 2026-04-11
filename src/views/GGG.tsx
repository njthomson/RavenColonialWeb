import * as api from '../api';
import { ActionButton, Callout, DirectionalHint, Icon, IconButton, mergeStyles, Panel, PanelType, Spinner, Stack } from '@fluentui/react';
import { Link2 } from '../components/LinkSrvSurvey';
import { appTheme, cn } from '../theme';
import { useMemo, useState } from 'react';
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

type SortField = 'bodyName' | 'planetClass' | 'surfaceTemp' | 'tag' | 'cmdr';

const sortBy = (gggData: GGGListRow[], by: SortField, invert: boolean) => {
  const sorted = gggData?.sort((a, b) => {
    switch (by) {
      case 'bodyName': return a.bodyName.localeCompare(b.bodyName) * (invert ? -1 : 1);
      case 'planetClass': return a.planetClass.localeCompare(b.planetClass) * (invert ? -1 : 1);
      case 'surfaceTemp': return (a.surfaceTemp - b.surfaceTemp) * (invert ? -1 : 1);
      case 'tag': return a.tag.localeCompare(b.tag) * (invert ? -1 : 1);
      case 'cmdr': return a.cmdr.localeCompare(b.cmdr) * (invert ? -1 : 1);
      default: throw new Error(`Unexpected sortField: ${by}`);
    }
  });
  return sorted;
};

export const GGG: React.FunctionComponent = () => {
  const [gggData, setGGGData] = useState<GGGListRow[] | undefined>(undefined);
  const [journalJson, setJournalJson] = useState<JournalJson | undefined>(undefined);
  const [showSrvHelp, setShowSrvHelp] = useState(false);
  const [sortField, setSortField] = useState<SortField>('bodyName');
  const [sortInvert, setSortInvert] = useState(false);

  window.document.title = `Green Gas Giants`;

  useMemo(() => {
    api.misc.ggg().then(result => {
      // reduce extra rows onto the first
      const map = result.reduce((m, r) => {
        const jj = { Commander: r.cmdr, Timestamp: '', ...JSON.parse(r.journalJson) };
        jj.Timestamp = jj.timestamp;
        delete jj.timestamp;
        if (!m[r.bodyName]) {
          m[r.bodyName] = { ...r, planetClass: jj.PlanetClass, journalJsons: [jj] };
        } else {
          m[r.bodyName].journalJsons.push(jj);
        }
        return m;
      }, {} as Record<string, GGGListRow>);

      setGGGData(sortBy(Object.values(map), 'bodyName', false));
    });
  }, []);

  useMemo(() => {
    setGGGData(g => sortBy(g ?? [], sortField, sortInvert));
  }, [sortField, sortInvert]);

  const renderColumn = (text: string, by: SortField | undefined) => {
    return <th className={by ? 'sortable' : undefined} onClick={() => {
      if (sortField === by) {
        setSortInvert(!sortInvert);
      } else if (by) {
        setSortField(by);
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

  return <div className={css} style={{ width: 'fit-content', margin: 10, }}>
    <div className='top'>
      <h2 className={cn.h3}>Green Gas Giants</h2>
      <div style={{ fontSize: 14, position: 'relative' }}>
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
            onClick={() => setShowSrvHelp(!showSrvHelp)}
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
        onDismiss={() => setTimeout(() => setShowSrvHelp(false), 0)}
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
                  <Icon iconName={mapTagIcon[row.tag]} />
                  <div>{row.tag}</div>
                </Stack>
              </td>
              <td>{row.cmdr}</td>
              <td className='json'>
                {row.journalJsons.map(jj => <IconButton
                  key={`jjb-${jj.BodyName}-${jj.Timestamp}`}
                  id={`row-${jj.BodyName}-${jj.Timestamp}`}
                  className={cn.bBox}
                  iconProps={{ iconName: 'TextDocument' }}
                  onClick={() => setJournalJson(journalJson === jj ? undefined : jj)}
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
          setJournalJson(undefined);
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

const mapTagIcon: Record<string, string> = {
  'likely': 'SkypeCircleCheck',
  'likely-approx': 'SkypeCircleSlash',
  'potential': 'Location',
  'potential-approx': 'StatusCircleRing',
}