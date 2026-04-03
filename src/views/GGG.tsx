import * as api from '../api';
import { ActionButton, Icon, IconButton, mergeStyles, Panel, PanelType, Spinner, Stack } from '@fluentui/react';
import { Link2 } from '../components/LinkSrvSurvey';
import { appTheme, cn } from '../theme';
import { useMemo, useState } from 'react';
import { GGGRow } from '../api/misc';
import { isMobile } from '../util';
import { CopyButton } from '../components/CopyButton';

const css = mergeStyles({
  '.top h2': {
    color: appTheme.palette.accent,
  },
  '.ms-Button--action': {
    height: 24,
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
    '.json': {
      textAlign: 'center',
      paddingRight: 0,
    },
  },
  '.tableScan': {
    '.scanKey': {
      color: appTheme.palette.themePrimary,
      paddingRight: 10,
    }
  },
});

export const GGG: React.FunctionComponent = () => {
  const [gggData, setGGGData] = useState<GGGRow[] | undefined>(undefined);
  const [showJournal, setShowJournal] = useState<GGGRow | undefined>(undefined);

  window.document.title = `Green Gas Giants`;

  useMemo(() => {
    api.misc.ggg().then(result => setGGGData(result));
  }, []);

  return <div className={css} style={{ width: 'fit-content', margin: 10, }}>
    <div className='top'>
      <h2 className={cn.h3}>Green Gas Giants</h2>
      <div style={{ fontSize: 14 }}>
        <div>Green giants are incredibly rare and have been catalogged by Cmdr Arcanic at <Link2 href='https://ed-ggg.github.io/edggg/' text='https://ed-ggg.github.io/edggg/' /></div>
        <div>Learn more about them by watching <Link2 href='https://youtu.be/hVS-S6FEJj4' text="Arcanic's video: Strange Temperatures" /> or see <Link2 href='https://forums.frontier.co.uk/threads/marxs-guide-to-green-gas-giants.618994/' text="Marx's guide to Green Gas Giants" /></div>
        <div style={{ marginTop: 20 }}>SrvSurvey has a feature to help detect green gas giants, to date logging {gggData?.length ?? '?'} bodies with suspected characteristics:</div>
      </div>
    </div>

    <div>
      {!gggData && <Spinner labelPosition='right' label='Loading ...' style={{ marginTop: 20 }} />}

      {!!gggData && <table className='tableBodies' cellSpacing={0} cellPadding={0}>
        <thead>
          <tr>
            <th>Body</th>
            <th>Temperature</th>
            <th>Tagged</th>
            <th>Commander</th>
            <th>Journal</th>
          </tr>
        </thead>

        <tbody>
          {gggData.map((row, index) => {
            return <tr key={index}>
              <td className='name'>
                <CopyButton text={row.bodyName} fontSize={12} color={appTheme.palette.themeSecondary} />&nbsp;{row.bodyName}
              </td>
              <td>{row.surfaceTemp.toLocaleString()} K</td>
              <td>
                <Stack horizontal verticalAlign='center' tokens={{ childrenGap: 4 }}>
                  <Icon iconName={mapTagIcon[row.tag]} />
                  <div>{row.tag}</div>
                </Stack>
              </td>
              <td className='cmdr'>{row.cmdr}</td>
              <td className='json'>
                <IconButton
                  id={`row-${row.id64}-${row.bodyID}`}
                  className={cn.bBox}
                  iconProps={{ iconName: 'TextDocument' }}
                  onClick={() => setShowJournal(showJournal === row ? undefined : row)}
                />
              </td>
            </tr>;
          })}
        </tbody>
      </table>}
    </div>

    {!!showJournal && <>
      <Panel
        className={css}
        isOpen
        allowTouchBodyScroll={isMobile()}
        type={PanelType.medium}
        customWidth={'380px'}
        headerText={`Journal Scan: ${showJournal.bodyName}`}
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
              onClick={() => navigator.clipboard.writeText(showJournal.journalJson)}
            />
          </>;
        }}
        onDismiss={(ev: any) => {
          // if the mouse is over a button showing json for another body ... try clicking it
          if (ev.type === 'click') {
            setTimeout(() => {
              let btn = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement;
              while (!!btn?.parentElement && btn.tagName !== 'BUTTON') { btn = btn.parentElement; }

              if (btn?.id.startsWith('row-') && btn.id !== `row-${showJournal.id64}-${showJournal.bodyID}`) {
                btn.click();
              }
            }, 10);
          }

          // but close the panel first
          setShowJournal(undefined);
        }}
      >
        <div>
          <table className='tableScan'>
            <tbody>
              {Object.entries(JSON.parse(showJournal.journalJson)).map(([key, value]) => {
                const val = typeof value === 'object'
                  ? (JSON.stringify(value, null, 2) + `\nhello\nworld`)//.split('\n').map(t => <div>{t}</div>) }
                  : typeof value === 'number' ? value.toLocaleString() : value?.toString();

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