import * as api from '../api';
import { Component, ReactNode } from "react";
import { appTheme, cn } from "../theme";
import { ResponseEdsmSystemBodies } from '../types';
import { Icon, Spinner, SpinnerSize, Stack } from '@fluentui/react';

interface ChooseBodyProps {
  systemName: string;
  bodyName: string | undefined;
  onChange: (name: string, num: number) => void;
}

interface ChooseBodyState {
  bodyName: string | undefined
  loading: boolean;
  validBodies: Record<string, number>;
}

export class ChooseBody extends Component<ChooseBodyProps, ChooseBodyState> {
  static cache: Record<string, ResponseEdsmSystemBodies> = {};

  constructor(props: ChooseBodyProps) {
    super(props);

    this.state = {
      bodyName: props.bodyName ?? '',
      loading: false,
      validBodies: {},
    }
  }

  componentDidMount(): void {
    this.fetchSystemBodies(this.props.systemName)
      .catch(err => console.error(err));
  }

  componentDidUpdate(prevProps: Readonly<ChooseBodyProps>, prevState: Readonly<ChooseBodyState>, snapshot?: any): void {
    if (prevProps.systemName !== this.props.systemName) {
      this.setState({ bodyName: undefined });

      this.fetchSystemBodies(this.props.systemName)
        .catch(err => console.error(err));

    }

    if (prevProps.bodyName !== this.props.bodyName) {
      this.setState({ bodyName: this.props.bodyName });
    }
  }

  async fetchSystemBodies(systemName: string): Promise<void> {

    // use cached data?
    let system = ChooseBody.cache[systemName];

    // not cached, fetch from EDSM
    if (!system) {
      this.setState({ loading: true });
      system = await api.edsm.getSystemBodies(this.props.systemName);
      ChooseBody.cache[systemName] = system;
      this.setState({ loading: false });
    }

    // extract the names
    const newBodies = system.bodies
      .reduce((map, b) => {
        map[b.name] = b.bodyId;
        return map;
      }, {} as Record<string, number>);

    this.setState({ validBodies: newBodies });
  }

  render(): ReactNode {
    const { loading, bodyName, validBodies } = this.state;

    const rows = Object.keys(validBodies).map((name, i) => {
      return <option key={i} value={name}>{name}</option>;
    });
    rows.push(<option key={-1} value=''></option>);

    return <>
      <Stack horizontal verticalAlign='center' style={{ margin: 0 }}>
        <select

          style={{ display: 'inline', backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent, width: 200 }}
          value={bodyName}
          onChange={(e) => {
            let bodyId = this.state.validBodies[e.target.value];
            this.props.onChange(e.target.value, bodyId);
            this.setState({ bodyName: e.target.value });
          }}
        >
          {rows}
        </select>

        &nbsp;
        <Icon
          className={`icon-btn small ${cn.btn}`}
          iconName='Clear'
          title='Clear body name'
          onClick={() => {
            this.props.onChange!('', -1)
            this.setState({ bodyName: '' });
          }}
        />

        {loading && <>
          &nbsp;
          <Spinner size={SpinnerSize.small} styles={{ root: { display: 'inline', margin: '0!important', height: 22 }, circle: { display: 'inline-block' } }} />
        </>}

      </Stack>
    </>;
  }
}