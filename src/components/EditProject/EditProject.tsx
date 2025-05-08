import './EditProject.css';
import * as api from '../../api';
import { ActionButton, DefaultButton, IconButton, Label, MessageBar, MessageBarType, Modal, PrimaryButton, Spinner, Stack, Toggle } from "@fluentui/react";
import { Component } from "react";
import { CreateProject, Project, ProjectRef } from "../../types";
import { cn, appTheme } from "../../theme";
import { BuildType } from "../BuildType";
import { ChooseBody } from "../ChooseBody";
import { TimeRemaining } from "../TimeRemaining";


interface ChooseEditProjectProps {
  proj: ProjectRef;
  onChange: (updatedProj?: Project) => void;
}

interface ChooseEditProjectState {
  editProject: ProjectRef;
  submitting?: boolean;
  errorMsg?: string;
}

export class EditProject extends Component<ChooseEditProjectProps, ChooseEditProjectState> {

  constructor(props: ChooseEditProjectProps) {
    super(props);

    this.state = {
      editProject: props.proj
    };
  }

  componentDidMount(): void {
    const { editProject } = this.state;

    if (!editProject.buildId && !editProject.systemAddress && editProject.systemName) {
      // look-up systemAddress from systemName
      api.edsm.findSystemFactions(editProject.systemName).then(response => {
        const updatedProj = {
          ...this.state.editProject,
          systemAddress: response.id64,
        };

        this.setState({ editProject: updatedProj });
      })
    }
  }

  componentDidUpdate(prevProps: Readonly<ChooseEditProjectProps>, prevState: Readonly<ChooseEditProjectState>, snapshot?: any): void {
    if (prevProps.proj !== this.props.proj) {
      this.setState({
        editProject: this.props.proj
      });
    }
  }

  render() {
    const { editProject, errorMsg } = this.state;

    return <Modal
      className='project-edit'
      isOpen
      allowTouchBodyScroll
      onDismiss={() => this.setState({})}
    >

      <table>
        <tbody>

          <tr>
            <td style={{ alignContent: 'start' }}><Label required>Build name:</Label></td>
            <td>
              <input className='tinput' type='text' value={editProject.buildName} onChange={(ev) => this.updateProjData('buildName', ev.target.value)} autoFocus style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }} />
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
            <td><div className='grey' style={{ backgroundColor: appTheme.palette.purpleLight }}>
              <BuildType buildType={editProject.buildType!} onChange={(value) => this.updateProjData('buildType', value)} />
            </div>
            </td>
          </tr>

          <tr>
            <td><Label>System name:</Label></td>
            <td><div className='grey hint' style={{ backgroundColor: appTheme.palette.purpleLight }}>{editProject.systemName}</div></td>
          </tr>

          <tr>
            <td><Label>Body name:</Label></td>
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
              <input className='tinput' type='text' value={editProject.architectName} onChange={(ev) => this.updateProjData('architectName', ev.target.value)} style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }} />
            </td>
          </tr>

          <tr>
            <td><Label>Faction:</Label></td>
            <td>
              <input className='tinput' type='text' value={editProject.factionName} onChange={(ev) => this.updateProjData('factionName', ev.target.value)} style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }} />
            </td>
          </tr>

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
              <textarea className='notes' value={editProject.notes} onChange={(ev) => this.updateProjData('notes', ev.target.value)} style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }} />
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
            <td><input className='tinput' type='text' value={editProject.discordLink ?? ''} onChange={(ev) => this.updateProjData('discordLink', ev.target.value)} style={{ backgroundColor: appTheme.palette.white, color: appTheme.palette.black, border: '1px solid ' + appTheme.palette.accent }} /></td>
          </tr>}

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
    const { editProject } = this.state;

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

    // stop here if nothing changed
    if (Object.keys(deltaProj).length === 1) {
      this.props.onChange();
      return;
    }

    // add a little artificial delay so the spinner doesn't flicker in and out
    this.setState({ submitting: true, errorMsg: undefined });

    await new Promise(resolve => setTimeout(resolve, 500));

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

    await new Promise(resolve => setTimeout(resolve, 500));

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