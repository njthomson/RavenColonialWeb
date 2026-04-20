import { Icon, Spinner, SpinnerSize } from '@fluentui/react';
import { store } from '../local-storage';
import { appTheme } from '../theme';
import { Component } from 'react';


export type MapData = {
  source: string;
  init: Record<string, any>;
  mapData: {
    categories: Record<string, Record<string, { name: string; color: string; }>>;
    systems: { name: string; coords: { x: number; y: number; z: number; }; cat: number[]; infos: string; }[];
    routes?: { title: string; points: { s: string; label?: string | undefined; }[]; }[];
  }
}

interface GalMapProps {
  source: string | undefined;
}

interface GalMapState {
  mapData?: any;
  posting?: boolean;
}

export class GalMap extends Component<GalMapProps, GalMapState> {
  static open(mapData: MapData) {
    localStorage.setItem(`map-${mapData.source}`, JSON.stringify(mapData));
    window.open(`/#map=${mapData.source}`, 'ravenMap');
  }

  constructor(props: GalMapProps) {
    super(props);

    // use data previously given?
    const mapData = localStorage.getItem(`map-${props.source}`);
    if (!mapData) { throw new Error(`No mapData from source: ${props.source}`); }

    this.state = {
      mapData: mapData && JSON.parse(mapData),
    };
  }

  componentDidMount(): void {
    window.addEventListener('message', this.messageListener);
    // tell opener we are ready to receive data
    if (!this.state.mapData && !!window.opener) {
      window.opener.postMessage({ ready: 'host' });
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.messageListener);
  }

  componentDidUpdate(prevProps: Readonly<GalMapProps>, prevState: Readonly<GalMapState>, snapshot?: any): void {
    if (prevProps.source !== this.props.source) {
      const mapData = localStorage.getItem(`map-${this.props.source}`);
      if (!mapData) { throw new Error(`No mapData from source: ${this.props.source}`); }

      this.setState({ posting: true });

      setTimeout(() => {
        this.setState({
          posting: false,
          mapData: mapData && JSON.parse(mapData),
        });
      }, 50);
    }
  }

  messageListener = (ev: MessageEvent) => {
    const { mapData } = this.state;

    // iframe is ready to receive data
    if (ev.data.ready === 'iframe' && !!mapData) {
      console.log(`!host!`, mapData);
      ev.source?.postMessage(mapData);
    }
  }

  render() {
    const { mapData, posting } = this.state;

    return <>
      <div style={{ position: 'relative', margin: 0, padding: 0 }}>
        <div style={{ color: 'grey', fontSize: 10, textAlign: 'center', marginTop: -24 }}>
          <Icon className='icon-inline' iconName='Warning' />
          &nbsp;Experimental feature - work in progress&nbsp;
          <Icon className='icon-inline' iconName='Warning' />
        </div>

        {!mapData && <div style={{ position: 'relative', top: 80, textAlign: 'center', color: appTheme.palette.yellow }}>
          <Spinner
            size={SpinnerSize.large}
            labelPosition='right'
            label='Fetching your systems...'
            styles={{ label: { fontSize: 24 } }}
          />
        </div>}

        {!!mapData && !posting && <iframe
          id='mapFrame'
          src={`/map/map_architect.html?cmdr=${store.cmdrName}`}
          title='Map'
          style={{
            position: 'fixed',
            left: 0,
            top: 55,
            width: '100vw',
            height: '100vh',
            border: 0,
          }}
        />}
      </div>
    </>;
  }
}
