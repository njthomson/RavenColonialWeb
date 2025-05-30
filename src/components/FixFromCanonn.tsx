
import * as api from '../api';
import { DefaultButton, MessageBar, MessageBarType, Spinner, Stack } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { SiteMap } from "../system-model";
import { BodyFeature, Project, SystemFeature } from '../types';

export const FixFromCanonn: FunctionComponent<{ sites: SiteMap[] }> = (props) => {
  const [fixing, setFixing] = useState(false);
  const [msg, setMsg] = useState('');

  const actions = <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} horizontalAlign='end' verticalAlign='center' >
    {fixing && <Spinner
      style={{ marginRight: 20 }}
      label={msg}
      labelPosition="right"
    />}

    <DefaultButton
      disabled={fixing}
      onClick={() => {
        setFixing(true);
        setMsg('Querying Canonn for data...');
        updatedSitesFromCanonn(props.sites, setMsg);
      }}>
      Fix them
    </DefaultButton>
  </Stack>;

  return <>
    <MessageBar
      isMultiline
      messageBarType={MessageBarType.warning}
      styles={{ root: { margin: '8px 0', maxWidth: 600 } }}
      actions={actions}
    >
      <span>
        Some sites are missing information needed for economy calculations. Typically these can be fixed by matching data from Canonn and Spansh.
        The page will reload automatically once updates are applied.
      </span>
    </MessageBar>
  </>;
};


const updatedSitesFromCanonn = async (sites: SiteMap[], setMsg: React.Dispatch<React.SetStateAction<string>>) => {
  try {
    // fetch from Canonn (assuming we have a system address)
    let systemAddress = sites.find(s => s.systemAddress > 0)?.systemAddress ?? 0;
    if (!systemAddress) return;
    const canonnResponse = await api.edsm.getCanonnBioStats(systemAddress);

    const deltas = [];

    for (const site of sites) {
      // skip sites without a body name, or no match from Canonn
      if (!site.bodyName) continue;
      const canonnBody = canonnResponse.bodies.find(b => b.name === site.bodyName);
      if (!canonnBody) return;

      let delta: Partial<Project> = {};
      const bodyFeatures = new Set(site.bodyFeatures);

      // map body type, if not already set
      if (!site.bodyType) {
        switch (canonnBody.subType) {
          case 'Earth-like world': delta.bodyType = 'elw'; break;
          case 'Water world': delta.bodyType = 'ww'; break;
          case 'Ammonia world': delta.bodyType = 'ammonia'; break;
          case 'High metal content world': delta.bodyType = 'hmc'; break;
          case 'Metal-rich body': delta.bodyType = 'hmc'; break;
          case 'Rocky Ice world': delta.bodyType = 'rockyice'; break;
          case 'Rocky body': delta.bodyType = 'rocky'; break;
          case 'Icy body': delta.bodyType = 'icy'; break;
          //case 'asteroid': site.bodyType = 'rocky'; break;
          default:
            if (canonnBody.subType?.toLowerCase().includes('gas giant')) {
              delta.bodyType = 'gg';
            } else if (canonnBody.subType === 'Black Hole' || canonnBody.subType?.startsWith('White Dwarf') || canonnBody.subType === 'Neutron Star') {
              delta.bodyType = 'remnant';
            } else if (canonnBody.type === 'Star') {
              delta.bodyType = 'star';
            } else {
              console.error(`Unknown body type: ${canonnBody.subType} for ${site.bodyName}\n`, canonnBody);
            }
        }
        console.log(`FIX: ${site.buildName} - bodyType: ${site.bodyType} => ${delta.bodyType}`);
      }

      // any bio or geo signals?
      if (!!canonnBody.signals?.signals) {
        if ('$$SAA_SignalType_Biological;' in canonnBody.signals.signals && !bodyFeatures.has(BodyFeature.bio)) {
          bodyFeatures.add(BodyFeature.bio);
        }

        if ('$SAA_SignalType_Geological;' in canonnBody.signals.signals && !bodyFeatures.has(BodyFeature.geo)) {
          bodyFeatures.add(BodyFeature.geo);
        }
      }
      // any rings ?
      if (!!canonnBody.rings && !bodyFeatures.has(BodyFeature.rings)) {
        bodyFeatures.add(BodyFeature.rings);
      }
      // volcanism ?
      if (!!canonnBody.volcanismType && canonnBody.volcanismType !== 'No volcanism' && !bodyFeatures.has(BodyFeature.volcanism)) {
        bodyFeatures.add(BodyFeature.volcanism);
      }
      // terraformable ?
      if (canonnBody.terraformingState === 'Candidate for terraforming' && !bodyFeatures.has(BodyFeature.terraformable)) {
        bodyFeatures.add(BodyFeature.terraformable);
      }
      // tidally locked ?
      if (!!canonnBody.rotationalPeriodTidallyLocked && !bodyFeatures.has(BodyFeature.tidal)) {
        bodyFeatures.add(BodyFeature.tidal);
      }

      const newBodyFeatures = Array.from(bodyFeatures) ?? [];
      const oldBodyFeatures = JSON.stringify(site.bodyFeatures ?? []);
      if (JSON.stringify(newBodyFeatures) !== oldBodyFeatures) {
        console.log(`FIX: ${site.buildName} - bodyFeatures: ${site.bodyFeatures} => ${bodyFeatures}`);
        delta.bodyFeatures = newBodyFeatures;
      }

      // only keep if we have changed something
      if (Object.keys(delta).length > 0) {
        delta.buildId = site.buildId;
        deltas.push(delta);
      }
    }

    // finally, check some system level things 
    const systemFeatures = new Set(sites[0].systemFeatures);

    // any black holes, white dwarfs or neutron stars ?
    const hasBlackHoles = canonnResponse.bodies.some(b => b.subType === 'Black Hole');
    if (hasBlackHoles && !systemFeatures.has(SystemFeature.blackHole)) {
      systemFeatures.add(SystemFeature.blackHole);
    }
    const hasWhiteDwarf = canonnResponse.bodies.some(b => b.subType?.startsWith('White Dwarf'));
    if (hasWhiteDwarf && !systemFeatures.has(SystemFeature.whiteDwarf)) {
      systemFeatures.add(SystemFeature.whiteDwarf);
    }
    const hasNeutronStar = canonnResponse.bodies.some(b => b.subType === 'Neutron Star');
    if (hasNeutronStar && !systemFeatures.has(SystemFeature.neutronStar)) {
      systemFeatures.add(SystemFeature.neutronStar);
    }

    const newSystemFeatures = Array.from(systemFeatures) ?? [];
    const oldSystemFeatures = JSON.stringify(sites[0].systemFeatures ?? []);
    if (JSON.stringify(newSystemFeatures) !== oldSystemFeatures) {
      console.log(`FIX: systemFeatures: ${sites[0]?.systemFeatures ?? []} => ${systemFeatures}`);
      if (deltas.length > 0) {
        deltas[0].systemFeatures = newSystemFeatures;
      } else {
        deltas.push({
          buildId: sites[0].buildId,
          systemFeatures: newSystemFeatures
        });
      }
    }

    // system reserve levels ?
    const systemReserveLevel = canonnResponse.bodies.find(b => !!b.reserveLevel)?.reserveLevel;
    if (systemReserveLevel) {
      console.log(`FIX: systemReserveLevel: ${sites[0]?.reserveLevel ?? ''} => ${systemReserveLevel}`);
      if (deltas.length > 0) {
        deltas[0].reserveLevel = systemReserveLevel;
      } else {
        deltas.push({
          buildId: sites[0].buildId,
          reserveLevel: systemReserveLevel,
        });
      }
    }


    console.log(`FIX: Updating ${deltas.length} sites ...`);
    setMsg(`Updating ${deltas.length} sites...`);

    // update server if we have any changes
    if (deltas.length > 0) {
      for (const delta of deltas) {
        await api.project.update(delta.buildId!, delta);
      }
    }

    // reload the whole window once we're done.
    // TODO: do we really have to?
    window.location.reload();

  } catch (err: any) {
    console.error(`updatedSitesFromCanonn failed:`, err.stack);
    setMsg(`Error!`);
    alert(err.message);
  }
};
