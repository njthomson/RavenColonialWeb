import * as api from '../../api';
import { FunctionComponent, useEffect, useState } from "react";
import { ActionButton, Link, Spinner, Stack } from "@fluentui/react";
import { store } from '../../local-storage';
import { appTheme } from '../../theme';

export const ShowMySystems: FunctionComponent<{ foo?: string }> = (props) => {
  const [showList, setShowList] = useState(false);
  const [systems, setSystems] = useState<Record<string, number> | undefined>();
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (showList && !systems) {

      // fetch prior systems
      setLoading(true);
      api.cmdr.getProjectRefs(store.cmdrName)
        .then(refs => {
          // count how many projects in each system
          const map = refs.reduce((m, r) => {
            m[r.systemName] = (m[r.systemName] ?? 0) + 1;
            return m;
          }, {} as Record<string, number>);

          // alpha sort by system name
          const sorted = Object.keys(map)
            .sort((a, b) => a.localeCompare(b))
            .reduce((m, k) => {
              m[k] = map[k];
              return m;
            }, {} as Record<string, number>);

          setSystems(sorted);
          setLoading(false);
        });
    }
  }, [showList, systems]);

  return <div style={{ fontSize: 14 }}>
    <ActionButton
      iconProps={{ iconName: showList ? 'ChevronDownSmall' : 'ChevronUpSmall' }}
      text='Show my systems ...'
      title='Show systems where you have contributed to a site'
      onClick={() => setShowList(!showList)}
    />

    {showList && <div style={{ justifyContent: 'left' }}>
      <div style={{ marginBottom: 10, color: appTheme.palette.themeSecondary }}>Systems where you have contributed to a project site:</div>
      {loading && <Stack horizontal><Spinner labelPosition='right' label='Loading ...' /></Stack>}
      {systems && Object.keys(systems).length > 0 && <div>
        <ul>
          {Object.entries(systems).map(([name, count]) => (<li key={`s${name}`}>
            <Link onClick={() => window.location.replace(`/#sys=${name}`)}>
              {name}
              <span style={{ color: 'grey' }}> - {count} sites</span>
            </Link>
          </li>))}
        </ul>
      </div>}
    </div>}
  </div>;
}