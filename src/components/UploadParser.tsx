import { DefaultButton, Icon, mergeStyles } from '@fluentui/react';
import { FunctionComponent, useState } from 'react';
import { appTheme, cn } from '../theme';
import { CopyButton } from './CopyButton';
import { StackH } from './Widgets';
import { sum } from '../util';

const css = mergeStyles({
  '.uploader': {
    backgroundColor: appTheme.palette.neutralLight,
    width: 'max-content',
    '.inner': {
      margin: 4,
      padding: 4
    }

  },
  '.journal': {
    width: 'max-content',
    margin: 4,
    padding: 4,
    fontSize: 14,
    border: '2px dotted ' + appTheme.palette.themeTertiary,
    '.dim1': {
      color: appTheme.palette.themeSecondary,
    },
    '.dim2': {
      color: appTheme.palette.themeTertiary,
    },
  },
});

interface ParsedData {
  filename: string;
  cmdr: string;
  mapDisplayNames: Record<string, string>;
  mapMarketIDs: Record<string, string>;
  fcContributions: Record<string, FCContribution>;
}

interface FCContribution {
  system: string;
  ident: string;
  count: number;
}

export const UploadParser: FunctionComponent<{}> = (props) => {
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<ParsedData[] | undefined>(undefined);

  return <div className={css}>
    <div className='uploader' style={{
    }}>
      <div className='inner'
        style={{
          border: dragOver ? `3px solid ${appTheme.palette.themePrimary}` : `3px dashed ${appTheme.palette.themeTertiary}`,
        }}
        onDragOver={(ev) => {
          ev.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(ev) => {
          ev.preventDefault();
          setDragOver(false);
        }}
        onDrop={(ev) => {
          ev.preventDefault();
          parseJournalFiles(ev.dataTransfer.files)
            .then(x => setParsed(x))
            .finally(() => setDragOver(false));
        }}
      >
        <div style={{ fontSize: 14, margin: '4px 0' }}>
          Drag or choose journal files where you contributed to re-loading FCs:&nbsp;
        </div>
        <div style={{ fontSize: 10, margin: '4px 0' }}>
          Journal files can be found in: <code className={cn.grey}>%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous</code> <CopyButton text='%HomeDrive%%HomePath%\Saved Games\Frontier Developments\Elite Dangerous' />
        </div>
        <div style={{ textAlign: 'right' }}>
          <input
            type="file"
            multiple
            id='browse-files'
            name="Journal*.log"
            style={{ display: 'none' }}
            onChange={(ev) => {
              parseJournalFiles(ev.target.files!).then(x => setParsed(x));;
            }}
          />
          <DefaultButton
            onClick={() => document.getElementById('browse-files')?.click()}
            text='Choose file(s)'
          />
        </div>
      </div>
    </div>

    {!!parsed?.length && <div>
      {parsed.map(j => {
        if (!Object.keys(j.fcContributions).length) { return null; }

        const sumTotal = sum(Object.values(j.fcContributions).map(x => x.count));
        const allFC = Object.values(j.fcContributions).map(x => x.ident).join(' + ');
        const sumCopy = `/addscore user:@${j.cmdr} points:${sumTotal} comment:${allFC}`;

        return <div key={j.filename} className='journal'>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: appTheme.palette.themeSecondary }}>{j.filename}</span>
            <span className='dim2'> Commander: </span>
            {j.cmdr}
          </div>

          {Object.values(j.fcContributions).map((x) => {
            const displayName = j.mapDisplayNames[x.ident];
            const copyTxt = `/addscore user:@${j.cmdr} points:${x.count} comment:${displayName} (${x.ident})`;
            return <StackH key={`${j.filename}-${x.ident}-${x.system}`} gap={8}>
              <CopyButton text={copyTxt} color={appTheme.palette.themeDarker} />
              <span>{x.count.toLocaleString()}</span>
              <Icon iconName='DoubleChevronRight8' style={{ color: appTheme.palette.themeTertiary }} />
              <span>{displayName} <span className='dim1'>({x.ident})</span></span>
              <span className='dim2'> in {x.system}</span>
            </StackH>
          })}

          <div style={{ fontSize: 12, marginTop: 4, borderTop: '1px solid ' + appTheme.palette.themeLight, color: appTheme.palette.themeTertiary }}>Grant total:</div>
          <StackH gap={8} >
            <CopyButton text={sumCopy} color={appTheme.palette.themeDarker} />
            <span>{sumTotal.toLocaleString()}</span>
            <Icon iconName='DoubleChevronRight8' style={{ color: appTheme.palette.themeTertiary }} />
            <span>{allFC}</span>
          </StackH>
        </div>;
      })}
    </div>
    }

  </div>;
};

const parseJournalFiles = async (files: FileList) => {
  const parsedData: ParsedData[] = [];
  try {
    if (!files) return [];


    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.log')) continue;
      const text = await file.text();
      const lines = text.split('\n');

      const mapMarketIDs: Record<string, string> = {};
      const mapDisplayNames: Record<string, string> = {};
      const fcContributions: Record<string, FCContribution> = {};
      let cmdr = '';
      let currentSystem = 'x';

      for (const line of lines) {
        if (!line.startsWith('{') && !line.endsWith('}')) { continue; }
        const entry = JSON.parse(line);

        if (entry.event === 'Commander') { cmdr = entry.Name; }
        if (['Location', 'FSDJump'].includes(entry.event)) { currentSystem = entry.StarSystem; }

        // map station name to MarketID
        if (entry.event === 'Docked') {
          mapMarketIDs[entry.MarketID] = entry.StationName
        }

        // Track explicit FCs
        if (entry.event === 'FSSSignalDiscovered' && entry.SignalType === 'FleetCarrier') {
          const ident = entry.SignalName.slice(-7).trim();
          const displayName = entry.SignalName.slice(0, -7).trim();
          mapDisplayNames[ident] = displayName;
        }

        if (entry.event === 'MarketSell') {
          const marketName = mapMarketIDs[entry.MarketID];
          if (isFCName(marketName)) {
            const key = `${marketName}-${currentSystem}`;
            // console.log(entry);
            if (!fcContributions[key]) {
              fcContributions[key] = {
                ident: marketName,
                system: currentSystem,
                count: 0,
              };
            }
            fcContributions[key].count += entry.Count;
          }
        }
      }

      parsedData.push({ filename: file.name, cmdr, mapDisplayNames, mapMarketIDs, fcContributions });
    }
  } catch (err: any) {
    console.error('parseJournalEntry', err.stack)
  }

  return parsedData;
};

const isFCName = (txt: string) => {
  return txt.length === 7 && txt[3] === '-';
}