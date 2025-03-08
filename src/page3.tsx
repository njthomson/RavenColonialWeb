import { useState } from 'react'

const ugh = {
  pending: undefined as Promise<string> | undefined,
};

let nn = 0;

export const Page3: React.FunctionComponent = () => {
  const [foo, setFoo] = useState('fetching...')
  // const [foo2, setFoo2] = useState(fetch('https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/cmdr/grinning2001/primary', { method: 'GET' })
  // .then(response => response.text()))


  if (!ugh.pending) {
    console.log(`begin`);
    ugh.pending = fetch('https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/cmdr/grinning2001/primary', { method: 'GET' })
      .then(response => response.text());
  }

  ugh.pending.then(buildId => {
    setFoo(buildId);
    console.log(`#${++nn} buildId: ${buildId}`);
  })
    .catch(err => {
      console.error(err);
    });


  return <>
    <div>PAGE 3: <span>{foo}</span></div>
  </>;
};
