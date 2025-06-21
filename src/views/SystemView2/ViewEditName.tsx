import { IconButton } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme } from "../../theme";

export const ViewEditName: FunctionComponent<{ name: string, onChange: (newName: string) => void }> = (props) => {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(props.name);

  const id = `ed-${Date.now()}`;
  return <div>

    {!editing && <>
      <IconButton
        title='Edit the name'
        iconProps={{ iconName: 'Edit' }}
        style={{ marginLeft: 4 }}
        onClick={(ev) => {
          ev.preventDefault();
          setEditing(true);
          // delayFocus(id);
        }}
      />
      <span style={{ cursor: 'default', marginLeft: 4 }}>{props.name}</span>
    </>}

    {editing && <>
      <input
        id={id}
        type='text'
        autoFocus
        value={editName}
        style={{
          color: appTheme.palette.black,
          backgroundColor: appTheme.palette.white,
        }}
        onClick={ev => ev.preventDefault()}
        onChange={(ev) => setEditName(ev.target.value)}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter') { props.onChange(editName); setEditing(false); }
          if (ev.key === 'Escape') { setEditing(false); }
        }}
      />

      <IconButton
        title='Accept changes'
        iconProps={{ iconName: 'Accept' }}
        style={{ marginLeft: 4 }}
        onClick={(ev) => {
          ev.preventDefault();
          props.onChange(editName);
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
