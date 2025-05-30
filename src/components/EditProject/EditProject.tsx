import './EditProject.css';
import * as api from '../../api';
import { ActionButton, Checkbox, DatePicker, DefaultButton, Dropdown, Icon, IconButton, Label, MessageBar, MessageBarType, Modal, PrimaryButton, Spinner, Stack, Toggle } from "@fluentui/react";
import { Component } from "react";
import { BodyFeature, CreateProject, mapBodyTypeNames, mapReserveLevel, Project, ProjectRef, SystemFeature } from "../../types";
import { cn, appTheme } from "../../theme";
import { BuildType } from "../BuildType";
import { ChooseBody } from "../ChooseBody";
import { TimeRemaining } from "../TimeRemaining";
import { delay, isMobile } from '../../util';
import { mapName } from '../../site-data';
import { CalloutMsg } from '../CalloutMsg';


interface ChooseEditProjectProps {
  proj: ProjectRef;
  onChange: (updatedProj?: Project) => void;
  showAdvanced?: boolean;
  fieldHighlight?: string;
}

interface ChooseEditProjectState {
  editProject: ProjectRef;
  submitting?: boolean;
  errorMsg?: string;
  showAdvanced?: boolean;
  bodyFeatures: Set<string>;
  systemFeatures: Set<string>;
}

export class EditProject extends Component<ChooseEditProjectProps, ChooseEditProjectState> {

  constructor(props: ChooseEditProjectProps) {
    super(props);

    this.state = {
      editProject: props.proj,
      showAdvanced: props.showAdvanced,
      bodyFeatures: new Set<string>(props.proj.bodyFeatures),
      systemFeatures: new Set<string>(props.proj.systemFeatures),
    };
  }

  componentDidMount(): void {
    const { editProject } = this.state;
    window.addEventListener('keydown', this.onKeyPress);

    if (!editProject.buildId && !editProject.systemAddress && editProject.systemName) {
      // look-up systemAddress from systemName
      api.edsm.findSystemFactions(editProject.systemName).then(response => {
        const updatedProj = {
          ...this.state.editProject,
          systemAddress: response.id64,
        };

        this.setState({ editProject: updatedProj });
      });
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('keydown', this.onKeyPress);
  }

  onKeyPress = (ev: { key: string }) => {
    if (ev.key === 'Escape') { this.props.onChange(); }
  };

  componentDidUpdate(prevProps: Readonly<ChooseEditProjectProps>, prevState: Readonly<ChooseEditProjectState>, snapshot?: any): void {
    if (prevProps.proj !== this.props.proj) {
      this.setState({
        editProject: this.props.proj
      });
    }
  }

  render() {
    const { editProject, errorMsg, showAdvanced, bodyFeatures, systemFeatures } = this.state;

    const dateCompletedHelpElement = <span>
      The <b>Date completed</b> value is needed for two important reasons:
      <br />
      - To accurately scale Tier 2 and 3 points once there are 3+ large ports in the system.
      <br />
      - Should there be multiple Tier 2 or 3 ports on or around the same body, the oldest will receive strong links.
      <br />
      <br />
      It is set automatically but may be missing on older projects. It does not need to be an accurate value necessarily,
      <br />
      so long as the dates can be used to order large ports relative to each other.
    </span>;

    return <Modal
      className='project-edit'
      isOpen
      allowTouchBodyScroll={isMobile()}
      onDismiss={() => this.setState({})}
    >

      <table>
        <tbody>

          <tr>
            <td style={{ alignContent: 'start' }}><Label required>Build name:</Label></td>
            <td>
              <input
                autoFocus
                className='tinput'
                type='text'
                value={editProject.buildName}
                onChange={(ev) => this.updateProjData('buildName', ev.target.value)}
                style={{
                  backgroundColor: appTheme.palette.white,
                  color: appTheme.palette.black,
                  border: '1px solid ' + appTheme.palette.black
                }}
                onKeyDown={(ev) => this.onKeyPress(ev)}
              />
              <Toggle
                onText='Primary port' offText='Primary port'
                defaultChecked={editProject.isPrimaryPort}
                styles={{ root: { height: 25, margin: 0, marginTop: 6 } }}
                onChange={(_, checked) => this.updateProjData('isPrimaryPort', checked)}
              />
            </td>
          </tr>

          <tr>
            <td><Label required>Build type:</Label></td>
            <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }} onKeyDown={(ev) => this.onKeyPress(ev)}>
              <BuildType buildType={editProject.buildType!} onChange={(value) => this.updateProjData('buildType', value)} />
            </div>
            </td>
          </tr>

          <tr>
            <td><Label>System name:</Label></td>
            <td><div className='grey hint' style={{ backgroundColor: appTheme.palette.purpleLight }}>{editProject.systemName}</div></td>
          </tr>

          <tr>
            <td>
              <Label style={{ color: this.props.fieldHighlight === 'bodyName' ? appTheme.palette.yellowDark : undefined }}>
                Body name:
                {this.props.fieldHighlight === 'bodyName' && <Icon className='icon-inline' iconName='AlertSolid' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} />}
              </Label>
            </td>
            <td>
              {editProject && <div style={{ backgroundColor: appTheme.palette.purpleLight }}>
                <ChooseBody systemName={editProject.systemName} bodyName={editProject.bodyName} onChange={(newName, newId) => {
                  const editProject = { ...this.state.editProject };
                  if (editProject) {
                    editProject.bodyName = newName;
                    editProject.bodyNum = newId;
                    this.setState({ editProject });
                  }
                }} />
              </div>}
            </td>
          </tr>

          <tr>
            <td><Label>Architect:</Label></td>
            <td>
              <input className='tinput' type='text' value={editProject.architectName} onChange={(ev) => this.updateProjData('architectName', ev.target.value)} style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.black }} />
            </td>
          </tr>

          {/* <tr>
            <td><Label>Faction:</Label></td>
            <td>
              <input className='tinput' type='text' value={editProject.factionName} onChange={(ev) => this.updateProjData('factionName', ev.target.value)} style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }} />
            </td>
          </tr> */}

          {editProject.buildId && !editProject.complete && <tr>
            <td><Label>Time remaining:</Label></td>
            <td>
              <div id='due-time' className='grey' style={{ backgroundColor: appTheme.palette.purpleLight, height: 22 }}>
                {this.renderEditTimeRemaining(editProject)}
              </div>
            </td>
          </tr>}

          <tr>
            <td style={{ alignContent: 'start' }}><Label>Notes:</Label></td>
            <td>
              <textarea
                className='notes'
                value={editProject.notes}
                onChange={(ev) => this.updateProjData('notes', ev.target.value)}
                style={{
                  backgroundColor: appTheme.palette.white,
                  color: appTheme.palette.black,
                  border: '1px solid ' + appTheme.palette.black,
                  height: 36,
                }}
              />
            </td>
          </tr>

          {editProject.buildId && <tr>
            <td>
              <Stack horizontal verticalAlign='center' >
                <Label>Discord link:</Label>
                <IconButton
                  className={`btn icon-inline ${cn.btn}`}
                  title='Validate and paste a link'
                  iconProps={{ iconName: 'Paste' }}
                  style={{ height: 25 }}
                  onClick={async () => {
                    this.setState({ errorMsg: undefined });
                    var link = await navigator.clipboard.readText();
                    this.updateProjData('discordLink', link);
                  }}
                />
              </Stack>
            </td>
            <td><input className='tinput' type='text' value={editProject.discordLink ?? ''} onChange={(ev) => this.updateProjData('discordLink', ev.target.value)} style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.black }} /></td>
          </tr>}

          {editProject.complete && <tr>
            <td>
              <Label style={{ color: this.props.fieldHighlight === 'timeCompleted' ? appTheme.palette.yellowDark : undefined }}>
                <span id='edit-date-completed'>Date completed:</span>
                <CalloutMsg id='edit-date-completed' msg={dateCompletedHelpElement} marginLeft={4} />
                {this.props.fieldHighlight === 'timeCompleted' && <Icon className='icon-inline' iconName='AlertSolid' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} />}
              </Label>
            </td>
            <td>
              <DatePicker
                placeholder='Select date'
                styles={{
                  callout: { border: '1px solid ' + appTheme.palette.themePrimary }
                }}
                value={editProject.timeCompleted ? new Date(editProject.timeCompleted) : undefined}
                onSelectDate={(date) => {
                  if (date) { this.updateProjData('timeCompleted', date.toISOString()); }
                }}
              />
            </td>
          </tr>}

          <tr>
            <td></td>
            <td>
              <ActionButton
                className='small'
                iconProps={{ iconName: showAdvanced ? 'ChevronDownSmall' : 'ChevronUpSmall', style: { fontSize: 8 } }}
                text='Economy modelling fields'
                style={{ height: 22, paddingLeft: 0, }}
                onClick={() => this.setState({ showAdvanced: !showAdvanced })}
              />
            </td>
          </tr>

          {showAdvanced && <>
            <tr>
              <td><Label>Body type:</Label></td>
              <td>
                <Dropdown
                  openOnKeyboardFocus
                  placeholder='...'
                  options={Object.entries(mapBodyTypeNames).map(([key, text]) => ({ key, text }))}
                  selectedKey={this.state.editProject.bodyType}
                  onChange={(_, o) => this.updateProjData('bodyType', o?.key)}
                  styles={{
                    title: { height: 22, lineHeight: 22 },
                    caretDownWrapper: { height: 22, lineHeight: 22 },
                    callout: { border: '1px solid ' + appTheme.palette.themePrimary }
                  }}
                />
              </td>
            </tr>

            <tr>
              <td style={{ alignContent: 'start' }}><Label>Body features:</Label></td>
              <td>
                <Stack
                  horizontal wrap
                  verticalAlign='center'
                  tokens={{ childrenGap: '2px 8px' }}
                  style={{ width: 340, padding: 0, marginBottom: 8, marginRight: 4 }}
                >
                  {Object.values(BodyFeature).map(f => <Checkbox
                    key={`bf${f}`}
                    checked={bodyFeatures.has(f)}
                    label={mapName[f]}
                    onChange={(_ev, checked) => {
                      const { bodyFeatures } = this.state;
                      if (checked) {
                        bodyFeatures.add(f);
                      } else {
                        bodyFeatures.delete(f);
                      }
                      this.setState({ bodyFeatures });
                    }}
                  />)}
                </Stack>
              </td>
            </tr>

            <tr>
              <td style={{ alignContent: 'start' }}><Label>System features:</Label></td>
              <td>
                <Stack
                  horizontal wrap
                  verticalAlign='center'
                  tokens={{ childrenGap: '2px 8px' }}
                  style={{ width: 340, padding: 0, marginBottom: 8, marginRight: 4 }}
                >
                  {Object.values(SystemFeature).map(f => <Checkbox
                    key={`sf${f}`}
                    checked={systemFeatures.has(f)}
                    label={mapName[f]}
                    onChange={(_ev, checked) => {
                      const { systemFeatures } = this.state;
                      if (checked) {
                        systemFeatures.add(f);
                      } else {
                        systemFeatures.delete(f);
                      }
                      this.setState({ systemFeatures });
                    }}
                  />)}
                </Stack>
              </td>
            </tr>

            <tr>
              <td>
                <Label style={{ color: this.props.fieldHighlight === 'reserveLevel' ? appTheme.palette.yellowDark : undefined }}>
                  System reserves:
                  {this.props.fieldHighlight === 'reserveLevel' && <Icon className='icon-inline' iconName='AlertSolid' style={{ marginLeft: 4, color: appTheme.palette.yellowDark }} />}
                </Label>
              </td>
              <td>
                <Dropdown
                  openOnKeyboardFocus
                  placeholder='...'
                  options={Object.entries(mapReserveLevel).map(([key, text]) => ({ key, text }))}
                  selectedKey={this.state.editProject.reserveLevel}
                  onChange={(_, o) => this.updateProjData('reserveLevel', o?.key)}
                  styles={{
                    title: { height: 22, lineHeight: 22 },
                    caretDownWrapper: { height: 22, lineHeight: 22 },
                    callout: { border: '1px solid ' + appTheme.palette.themePrimary }
                  }}
                />
              </td>
            </tr>
          </>}

        </tbody>
      </table>

      {errorMsg && <MessageBar messageBarType={MessageBarType.error} isMultiline truncated >{errorMsg}</MessageBar>}

      <Stack horizontal tokens={{ childrenGap: 4, padding: 0, }} horizontalAlign='end' verticalAlign='baseline' >
        {(false || this.state.submitting) && <Spinner
          style={{ marginRight: 20 }}
          label="Saving changes ..."
          labelPosition="right"
        />}
        <PrimaryButton text='Save changes' iconProps={{ iconName: 'Save' }} onClick={this.onSaveChanges} />
        <DefaultButton text='Cancel' iconProps={{ iconName: 'Cancel' }} onClick={() => this.props.onChange()} />
      </Stack>

    </Modal>;
  };

  updateProjData = (key: keyof (Project), value: any) => {
    const editProject = { ...this.state.editProject } as any;

    if (editProject) {
      editProject[key] = value;
      this.setState({ editProject });
    }
  }

  renderEditTimeRemaining(editProject: Partial<Project>) {
    if (editProject.timeDue) {
      return <div className='small'>
        <TimeRemaining timeDue={editProject.timeDue} onChange={(dt) => this.updateProjData('timeDue', dt)} />
      </div>;
    } else {
      const defaultTimeRemaining = (28 * 24 * 60 * 60 * 1000) - 300_000; // ~28 days time, less 5 hours
      return <ActionButton
        iconProps={{ iconName: 'Timer' }}
        text='Add time remaining'
        onClick={() => this.updateProjData('timeDue', new Date(Date.now() + defaultTimeRemaining).toISOString())}
        style={{ height: 22 }}
      />;
    }
  }

  onSaveChanges = async () => {
    const { editProject, bodyFeatures, systemFeatures } = this.state;

    if (!editProject.buildId) {
      return this.onCreateNew();
    }

    if (editProject?.discordLink) {
      try {
        var url = new URL(editProject?.discordLink);
        if (url.origin !== 'https://discord.com' && url.origin !== 'https://discord.gg') throw new Error();
      } catch {
        console.error(`Invalid discord link: "${editProject?.discordLink}"`);
        this.setState({ errorMsg: `Invalid discord link: "${editProject?.discordLink}"` });
        return;
      }
    }

    // only send deltas
    const deltaProj = Object.keys(editProject).reduce((map, key) => {
      const kk = key as keyof (ProjectRef);
      if (this.props.proj[kk] !== editProject[kk]) {
        map[kk] = editProject[kk];
      }
      return map;
    }, {} as Record<string, any>)
    deltaProj.buildId = this.props.proj.buildId;

    const newBodyFeatures = Array.from(bodyFeatures) ?? [];
    const oldBodyFeatures = JSON.stringify(this.props.proj.bodyFeatures ?? []);
    if (JSON.stringify(newBodyFeatures) !== oldBodyFeatures) {
      deltaProj.bodyFeatures = newBodyFeatures;
    }

    const newSystemFeatures = Array.from(systemFeatures) ?? [];
    const oldSystemFeatures = JSON.stringify(this.props.proj.systemFeatures ?? []);
    if (JSON.stringify(newSystemFeatures) !== oldSystemFeatures) {
      deltaProj.systemFeatures = newSystemFeatures;
    }

    // stop here if nothing changed
    if (Object.keys(deltaProj).length === 1) {
      this.props.onChange();
      return;
    }

    // add a little artificial delay so the spinner doesn't flicker in and out
    this.setState({ submitting: true, errorMsg: undefined });
    await delay(500);

    try {
      const savedProj = await api.project.update(deltaProj.buildId, deltaProj);

      // success
      this.props.onChange(savedProj);
    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  };

  onCreateNew = async () => {
    const { editProject } = this.state;

    // check for required fields
    if (!editProject.systemAddress) {
      this.setState({ errorMsg: `Missing: systemAddress` });
      return;
    }
    if (!editProject.buildName) {
      this.setState({ errorMsg: `Missing: Build name` });
      return;
    }
    if (!editProject.buildType) {
      this.setState({ errorMsg: `Missing: Build type` });
      return;
    }

    // add a little artificial delay so the spinner doesn't flicker in and out
    this.setState({ submitting: true, errorMsg: undefined });
    await delay(500);

    try {
      const newProj = {
        ...editProject,
      } as CreateProject;
      const savedProj = await api.project.create(newProj);

      // success
      this.props.onChange(savedProj);
    } catch (err: any) {
      this.setState({ errorMsg: err.message });
    }
  };
}