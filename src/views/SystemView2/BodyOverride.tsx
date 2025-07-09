import * as api from '../../api';
import { FunctionComponent, useState } from "react";
import { Checkbox, DefaultButton, Icon, mergeStyles, Panel, PanelType, Stack } from "@fluentui/react";
import { appTheme } from '../../theme';
import { isMobile } from '../../util';
import { Bod } from '../../types2';
import { BodyFeature, mapBodyFeature } from '../../types';
import { BodyPut } from '../../api/v2-system';
import { SystemView2 } from "./SystemView2";
import { buildSystemModel2 } from '../../system-model2';

const rs = mergeStyles({
  marginLeft: 8,
  marginTop: 4,
})

export const BodyOverride: FunctionComponent<{ body: Bod; sysView: SystemView2; onClose: (newData?: BodyPut) => void }> = (props) => {

  const [bodyPut, setBodyPut] = useState<Required<BodyPut>>({
    num: props.body.num,
    features: props.body.features,
  });

  const rows = (Object.entries(mapBodyFeature) as [BodyFeature, string][]).map(([key, val]) => {
    if ([BodyFeature.atmos, BodyFeature.landable].includes(key)) { return null; }

    return <Checkbox
      key={`chbf-${key}`}
      className={rs}
      label={val}
      checked={bodyPut.features?.includes(key)}
      onChange={(ev, checked) => {
        const newFeatures = checked
          ? [...bodyPut.features, key]
          : bodyPut.features.filter(f => f !== key)
        setBodyPut({
          ...bodyPut,
          features: newFeatures
        });
      }}
    />;
  })

  return <>
    <Panel
      isOpen
      isLightDismiss
      className='build-order'
      headerText={`Update body: ${props.body?.name}`}
      allowTouchBodyScroll={isMobile()}
      type={PanelType.medium}
      styles={{
        overlay: { backgroundColor: appTheme.palette.blackTranslucent40 },
      }}
      onDismiss={(ev) => props.onClose()}
      onRenderFooterContent={() => {
        return <Stack horizontal horizontalAlign='end' tokens={{ childrenGap: 8 }} style={{ margin: 6, fontSize: 12 }}>
          <DefaultButton
            iconProps={{ iconName: 'Save' }}
            text='Save'
            onClick={() => {
              api.systemV2.updateBody(props.sysView.props.systemName, bodyPut)
                .then(newBodies => {
                  // clobber bodies with what we just received, and re-calc state
                  const newSysMap = buildSystemModel2({ ...props.sysView.state.sysMap, bodies: newBodies }, props.sysView.state.useIncomplete);
                  props.sysView.setState({
                    sysMap: newSysMap,
                    sysOriginal: { ...props.sysView.state.sysOriginal, bodies: newBodies },
                  });
                })
              props.onClose(bodyPut)
            }}
          />
          <DefaultButton
            iconProps={{ iconName: 'Cancel' }}
            text='Cancel'
            onClick={() => props.onClose()}
          />
        </Stack>;
      }}
    >
      <div style={{ margin: '8px 0', color: appTheme.palette.accent }}><Icon iconName='Warning' className='icon-inline' /> It is preferrable to scan systems and submit data through EDDN. Re-importing the system will clobber these manual overrides.</div>

      <h3>Body features:</h3>
      <div>
        {rows}
      </div>

    </Panel>
  </>;
}