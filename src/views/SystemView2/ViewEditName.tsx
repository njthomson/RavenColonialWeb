import { IconButton } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme } from "../../theme";

export const ViewEditName: FunctionComponent<{ name: string, onChange: (newName: string) => void }> = (props) => {
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
      <IconButton
        title='Edit the name'
        iconProps={{ iconName: 'Edit' }}
        style={{ marginLeft: 4 }}
        onClick={(ev) => {
          ev.preventDefault();
          setEditName(props.name);
          setEditing(true);
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
          width: 200,
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
