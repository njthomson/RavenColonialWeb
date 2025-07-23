import * as api from '../../api';
import { Stack, ActionButton, Panel, PanelType, Link, Modal } from "@fluentui/react";
import { FunctionComponent, useMemo, useState } from "react";
import { CargoGrid, CargoRemaining } from "../../components";
import { HaulSize } from "../../components/BigSiteTable/BigSiteTable";
import { getSiteType, averageHauls } from "../../site-data";
import { appTheme, cn } from "../../theme";
import { mergeCargo, isMobile, getCargoCountOnHand, sumCargo } from "../../util";
import { avgHaulCosts } from "../../avg-haul-costs";
import { store } from "../../local-storage";
import { KnownFC } from '../../types';
import { ModalCommander } from '../../components/ModalCommander';

export const HaulList: FunctionComponent<{ buildTypes: string[] }> = (props) => {
  const [showList, setShowList] = useState(false);
  const [knownFC, setKnownFC] = useState<KnownFC[]>([]);
  const [showCmdr, setShowCmdr] = useState(false);

  let totalHaul = 0;
  const cargos = [];
  const mapBuildTypeCount: Record<string, number> = {};
  for (const buildType of props.buildTypes) {
    const type = getSiteType(buildType)!;
    totalHaul += averageHauls[type.displayName2] ?? type.haul;
    if (avgHaulCosts[type.displayName2]) {
      cargos.push(avgHaulCosts[type.displayName2]);
      mapBuildTypeCount[buildType] = (mapBuildTypeCount[buildType] ?? 0) + 1;
    }
  }

  const cargoNeeded = mergeCargo(cargos);
  const cargoRemaining = sumCargo(cargoNeeded);
  const fcCargo = mergeCargo(knownFC.map(fc => fc.cargo));
  const cargoOnHand = getCargoCountOnHand(cargoNeeded, fcCargo)
  const fcRemaining = cargoRemaining - cargoOnHand;

  const rows = Object.entries(mapBuildTypeCount).map(([buildType, count]) => {
    const type = getSiteType(buildType)!;
    return <div key={`asl-${buildType}`}>
      {count} x {type.displayName2} ({buildType})
    </div>;
  });

  useMemo(async () => {
    if (!store.cmdrName) { return []; }

    try {
      const cmdrFCs = await api.cmdr.getCmdrLinkedFCs(store.cmdrName);
      setKnownFC(cmdrFCs);
    } catch (err: any) {
      if (err.statusCode !== 404) {
        // ignore cases where a project is not found
        console.error(`HaulList-getCmdrLinkedFCs: ${err.stack}`);
      }
    }
    return [];
  }, []);

  const width = 480 + knownFC.length * 80;
  return <>
    <Stack horizontal verticalAlign='center'>
      <HaulSize haul={totalHaul} />

      <ActionButton
        className={cn.bBox}
        iconProps={{ iconName: 'DeliveryTruck' }}
        text={`~${totalHaul.toLocaleString()} units`}
        style={{ height: 24 }}
        onClick={() => setShowList(true)}
      />
    </Stack>

    {showList && <>
      <Panel
        isOpen
        isLightDismiss
        headerText='Approximate shopping list:'
        allowTouchBodyScroll={isMobile()}
        type={PanelType.custom}
        customWidth={`${width}px`}
        styles={{
          header: { textTransform: 'capitalize', cursor: 'default' },
          overlay: { backgroundColor: appTheme.palette.blackTranslucent40, cursor: 'default' },
        }}
        onDismiss={(ev: any) => {
          setShowList(false)
        }}

        onRenderFooterContent={() => {
          return <>
            <CargoRemaining sumTotal={cargoRemaining} label='Remaining cargo' />
            <CargoRemaining sumTotal={fcRemaining} label='Fleet Carrier deficit' />
          </>;
        }}
      >

        <div style={{
          color: appTheme.palette.themeSecondary,
          margin: 4,
          fontSize: 12,
        }}>
          {rows}
        </div>

        <div style={{ textAlign: 'right' }}>
          <Link
            style={{ fontSize: 10 }}
            onClick={() => setShowCmdr(true)}
          >
            Track a Commander Linked Fleet Carrier?
          </Link>

          {showCmdr && <Modal isOpen>
            <ModalCommander onComplete={() => setShowCmdr(false)} preAddFC />
          </Modal>}
        </div>

        <CargoGrid cargo={cargoNeeded} linkedFC={knownFC} hideActive />
      </Panel>
    </>}
  </>;
};
