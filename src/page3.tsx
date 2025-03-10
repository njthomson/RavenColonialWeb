import * as React from 'react';


export class Page3 extends React.Component<{buildId: string | undefined}, {color: string}> {
  constructor(props) {
    super(props);
    console.log('Page3.ctor')
    this.state = {color: "red"};
  }

  async fetchProject() {
  const { buildId } = this.props;
      console.log('fetch? Project:', buildId);

        // await new Promise(resolve => setTimeout(resolve, 1000));
  
      console.log('fetch done Project:', buildId);
      this.setState({
        color: 'puce'
      });
  }


  componentDidMount() {
    console.log('Page3.componentDidMount');
    this.fetchProject();
  }

  shouldComponentUpdate() {
    console.log('Page3.shouldComponentUpdate');

    return true;
  }
  
  render() {
     const {color} = this.state;
    console.log('Page3.render')
    return <>
      <h2>Hi, I am a {color} Car!</h2>
      <button onClick={() => this.setState({color: 'green'})} >green</button>
    </>;
  }
}
// export const Page3: React.FunctionComponent = () => {
//   const [foo, setFoo] = useState('fetching...')
//   // const [foo2, setFoo2] = useState(fetch('https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/cmdr/grinning2001/primary', { method: 'GET' })
//   // .then(response => response.text()))

  
//   if (!ugh.pending) {
//     console.log(`begin`);
//     ugh.pending = fetch('https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/cmdr/grinning2001/primary', { method: 'GET' })
//       .then(response => response.text());
//   }

//   ugh.pending.then(buildId => {
//     setFoo(buildId);
//     console.log(`#${++nn} buildId: ${buildId}`);
//   })
//     .catch(err => {
//       console.error(err);
//     });


//   return <>
//     <div>PAGE 3: <span>{foo}</span></div>
//   </>;
// };
