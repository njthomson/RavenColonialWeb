import * as api from '../api';
import { Component, ReactNode } from "react";
import { appTheme, cn } from "../theme";
import { ResponseEdsmSystemBodies, ResponseEdsmSystemBody } from '../types';
import { ComboBox, IComboBoxOption, Icon, Spinner, SpinnerSize, Stack } from '@fluentui/react';

interface ChooseBodyProps {
  systemName: string;
  bodyName: string | undefined;
  onChange: (name: string, num: number) => void;
}

interface ChooseBodyState {
  bodyName: string | undefined
  loading: boolean;
  allBodies: Record<string, ResponseEdsmSystemBody>;
}

export class ChooseBody extends Component<ChooseBodyProps, ChooseBodyState> {
  static cache: Record<string, ResponseEdsmSystemBodies> = {};

  constructor(props: ChooseBodyProps) {
    super(props);

    this.state = {
      bodyName: props.bodyName ?? '',
      loading: false,
      allBodies: {},
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
        map[b.name] = b;
        return map;
      }, {} as Record<string, ResponseEdsmSystemBody>);

    this.setState({ allBodies: newBodies });
  }

  render(): ReactNode {
    const { loading, bodyName, allBodies: validBodies } = this.state;

    const rows = Object.keys(validBodies).map((name, i) => {
      return <option key={i} value={name}>{name} ({validBodies[name].subType})</option>;
    });
    rows.push(<option key={-1} value=''></option>);

    const options: IComboBoxOption[] = Object.keys(validBodies).map((name, i) => {
      return {
        key: i,
        text: name,
        data: validBodies[name],
      };
    });

    return <>
      <Stack horizontal verticalAlign='center' style={{ margin: 0 }}>

        <ComboBox
          text={bodyName}
          openOnKeyboardFocus
          styles={{
            root: { maxHeight: 20 },
            callout: { border: '1px solid ' + appTheme.palette.themePrimary, },
          }}
          options={options}
          onChange={(_, o) => {
            let body = this.state.allBodies[o?.text ?? ''];
            this.props.onChange(body.name, body.bodyId);
            this.setState({ bodyName: body.name });
          }}
          onRenderOption={item => {
            const body = item?.data as ResponseEdsmSystemBody;
            return <span>
              <span style={{ fontWeight: 'bold' }}>{body.name}</span>
              <br />
              {body.subType} ~{body.distanceToArrival.toLocaleString()}ls
            </span>;
          }}
        />

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