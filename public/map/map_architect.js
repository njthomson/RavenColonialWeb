var map = {
  init: async function () {
    try {
      const params = new URLSearchParams(window.location.search.substring(1));
      const cmdr = params.get('cmdr');

      const response = await fetch(`https://ravencolonial100-awcbdvabgze4c5cq.canadacentral-01.azurewebsites.net/api/cmdr/${encodeURIComponent(cmdr)}/map/architect`);

      // exit early if not success
      if (response.status !== 200) {
        console.error(`Failed to load map data: ${response.status} : ${response.statusText}`);
        return;
      }
      const mapData = await response.json();

      // process infos json into html
      let pPos = [0, 0, 0];
      for (const sys of mapData.systems) {
        var blob = JSON.parse(sys.infos);

        pPos[0] += blob.pos[0];
        pPos[1] += blob.pos[1];
        pPos[2] += blob.pos[2];

        console.log(blob);

        sys.infos = `<a class='bl' href='/#sys=${blob.id64}' target='_blank' style="font-size: 12px">View: ${blob.name}</a><br/>`
        if (blob.fav) { sys.infos += `(favourite)<br/>`; }

        sys.infos += `<br/>`
          + '<div style="font-size: 18px;">'
          + `Score: ${blob.score.toLocaleString()}<br/>`
          + `Points: T2: ${blob.tierPoints.tier2.toLocaleString()} T3: ${blob.tierPoints.tier3.toLocaleString()}<br/>`
          + `Population: ${blob.pop?.pop.toLocaleString() ?? '?'}<br/>`
          + `<br/>Sites:<div style="font-size: 14px">`
          ;

        const countComplete = blob.sites.filter(s => s.status === 'complete').length
        if (countComplete > 0) { sys.infos += `Complete: ${countComplete.toLocaleString()}<br/>`; }
        const countBuild = blob.sites.filter(s => s.status === 'build').length
        if (countBuild > 0) { sys.infos += `Building: ${countBuild.toLocaleString()}<br/>`; }
        const countPlan = blob.sites.filter(s => s.status === 'plan').length
        if (countPlan > 0) { sys.infos += `Planning: ${countPlan.toLocaleString()}<br/>`; }
        sys.infos += `</div><br/>`;

        sys.infos += `</div>`;

        if (blob.nickname) {
          sys.name = blob.nickname;
        }
      }

      // determine average and width for the view-port
      pPos[0] = pPos[0] / mapData.systems.length;
      pPos[1] = pPos[1] / mapData.systems.length;
      pPos[2] = pPos[2] / mapData.systems.length;

      Ed3d.init({
        container: 'edmap',
        json: mapData,
        withFullscreenToggle: false,
        withHudPanel: true,
        hudMultipleSelect: true,
        effectScaleSystem: [150, 10000],
        startAnim: true,
        playerPos: pPos,
        cameraPos: [0, 4000, -4000],
        systemColor: '#00aaaa',
        popupDetail: true,
      });
    } catch (err) {
      console.log(err);

      const errMsg = document.createElement('div');
      errMsg.style.color = 'grey';
      errMsg.innerText = `Oops: \t${err.stack}`;

      document.body.appendChild(errMsg);
    }
  },
}