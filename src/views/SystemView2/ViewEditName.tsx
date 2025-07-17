import { ActionButton, IconButton } from "@fluentui/react";
import { FunctionComponent, useState } from "react";
import { appTheme, cn } from "../../theme";

export const ViewEditName: FunctionComponent<{ name: string; onChange: (newName: string) => void; noBold?: boolean }> = (props) => {
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
        text={props.name}
        title='Edit the name'
        iconProps={{ iconName: 'Edit' }}
        style={{ marginLeft: 4, fontSize: props.noBold ? undefined : '1.0em', fontWeight: props.noBold ? undefined : 'bold' }}
        className={cn.bBox}
        onClick={(ev) => {
          ev.preventDefault();
          setEditName(props.name);
          setEditing(true);
        }}
      />
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
          if (ev.key === 'Escape') { ev.preventDefault(); setEditing(false); }
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
