import { Icon, Spinner, SpinnerSize } from '@fluentui/react';
import { store } from '../local-storage';
import { appTheme } from '../theme';
import { Component } from 'react';

interface GalMapProps { }

interface GalMapState {
  mapData?: any;
  posting?: boolean;
}

export class GalMap extends Component<GalMapProps, GalMapState> {
  constructor(props: GalMapProps) {
    super(props);

    // use data previously given?
    const mapData = localStorage.getItem('mapData');
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

  messageListener = (ev: MessageEvent) => {
    const { mapData } = this.state;

    // iframe is ready to receive data
    if (ev.data.ready === 'iframe' && !!mapData) {
      // console.log(`!host!`, mapData);
      ev.source?.postMessage(mapData);
    }

    // opener is sending us data
    if (ev.data.source === 'opener') {
      // console.log(`!dataReceived!`, ev);
      localStorage.setItem('mapData', JSON.stringify(ev.data));
      // explicitly kill any existing iframe, so we can cleanly load another
      this.setState({ posting: true, mapData: ev.data });
      setTimeout(() => this.setState({ posting: false }), 10);
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
