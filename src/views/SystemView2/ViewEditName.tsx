import { ActionButton, IconButton } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme, cn } from "../../theme";
import { delayFocus } from "../../util";

export const ViewEditName: FunctionComponent<{ name: string; onChange: (newName: string) => void; noBold?: boolean, disabled?: boolean; prefix?: string; }> = (props) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.name);
  const [editName, setEditName] = useState('');

  if (name !== props.name) {
    setName(props.name);
    setEditing(false);
  }

  const id = `ed-${Date.now()}`;
  return <div>

    {!editing && <>
      <ActionButton
        disabled={props.disabled}
        text={(props.prefix ?? '') + props.name}
        title='Edit the name'
        iconProps={{ iconName: props.disabled ? undefined : 'Edit' }}
        style={{
          fontSize: props.noBold ? undefined : '1.0em',
          fontWeight: props.noBold ? undefined : 'bold',
          color: props.disabled ? appTheme.palette.themeSecondary : undefined,
        }}
        className={props.disabled ? undefined : cn.bBox}
        onClick={(ev) => {
          ev.preventDefault();
          setEditName(props.name);
          setEditing(true);
          delayFocus(id);
        }}
      />
    </>}

    {editing && <>
      {props.prefix && <span>{props.prefix}</span>}
      <input
        id={id}
        type='text'
        autoFocus
        value={editName}
        style={{
          width: 200,
          color: appTheme.palette.black,
          backgroundColor: appTheme.palette.white,
          marginBottom: 3,
        }}
        onClick={ev => ev.preventDefault()}
        onChange={(ev) => setEditName(ev.target.value)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') { props.onChange(editName.trim()); setEditing(false); }
          if (ev.key === 'Escape') { ev.preventDefault(); setEditing(false); }
        }}
        onFocus={(ev) => {
          ev.target.setSelectionRange(0, -1);
        }}
      />

      <IconButton
        title='Accept changes'
        iconProps={{ iconName: 'Accept' }}
        style={{ marginLeft: 4 }}
        onClick={(ev) => {
          ev.preventDefault();
          props.onChange(editName.trim());
          setEditing(false);
        }}
      />
      <IconButton
        title='Cancel changes'
        iconProps={{ iconName: 'Cancel' }}
        style={{ marginLeft: 4 }}
        onClick={(ev) => {
          ev.preventDefault();
          setEditing(false);
        }}
      />
    </>}

  </div>;
}
