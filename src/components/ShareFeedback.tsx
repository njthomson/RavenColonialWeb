import * as api from '../api';
import { DefaultButton, IconButton, Label, Modal, PrimaryButton, Spinner, Stack, TextField } from '@fluentui/react';
import { FunctionComponent, useRef, useState } from 'react';
import { appTheme, cn } from '../theme';
import { LinkSrvSurvey } from './LinkSrvSurvey';

export const ShareFeedback: FunctionComponent<{ topic: string; body?: string; onDismiss: () => void }> = (props) => {
  const [subject, setSubject] = useState(props.topic);
  const [message, setMessage] = useState(props.body ?? '');
  const [contact, setContact] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const addImageFiles = (files: Iterable<File> | null | undefined) => {
    if (!files) { return; }

    for (const file of Array.from(files).filter(f => f.type.startsWith('image/'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setImages(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onPaste = (ev: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const items = ev.clipboardData.items;
    const imageFiles: File[] = [];

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    addImageFiles(imageFiles);
  };

  const onSend = async () => {
    try {
      setSending(true);
      await api.misc.feedback({ subject, contact, message, images });
      props.onDismiss();
    } catch (err: any) {
      console.log(`Failed to submit feedback: ${err.stack}`);
      window.alert(`Failed to submit feedback: ${err.message}`);
    }
    setSending(false);
  };

  return <Modal
    isOpen
    onDismiss={props.onDismiss}
    styles={{ main: { margin: -10, padding: 10, border: '1px solid ' + appTheme.palette.themePrimary, } }}
  >
    <div style={{ width: 600 }}>
      <h3 className={cn.h3}>Feedback for Raven Colonial</h3>

      <div style={{ margin: '8px 0' }}>
        You can also share feedback on <LinkSrvSurvey href='https://discord.gg/nEWMqZNBdy' text="Discord" title='Discuss Raven Colonial + SrvSurvey' /> or <LinkSrvSurvey href='https://github.com/njthomson/SrvSurvey/issues' text='report issues on GitHub' title='Submit suggestions and bug reports' />
      </div>

      <TextField
        autoFocus
        label='Subject:'
        value={subject}
        onChange={(_, v) => setSubject(v ?? '')}
        styles={{ fieldGroup: { width: 600 }, root: { marginBottom: appTheme.spacing.s2 }, subComponentStyles: { label: { root: { color: appTheme.palette.accent } } } }}
      />
      <TextField
        label='Email:'
        description='(optional, if you would like a reply)'
        value={contact}
        onChange={(_, v) => setContact(v ?? '')}
        styles={{ fieldGroup: { width: 600 }, root: { marginBottom: appTheme.spacing.s2 }, subComponentStyles: { label: { root: { color: appTheme.palette.accent } } } }}
      />

      <TextField
        label='Message:'
        multiline rows={6}
        styles={{ fieldGroup: { width: 600 }, root: { marginBottom: appTheme.spacing.s2 }, subComponentStyles: { label: { root: { color: appTheme.palette.accent } } } }}
        value={message}
        onChange={(_, v) => setMessage(v ?? '')}
        onPaste={onPaste}
      />

      <Stack horizontal verticalAlign='center' horizontalAlign='space-between'>
        <Label style={{ color: appTheme.palette.themeSecondary }}>Images:</Label>
        <DefaultButton
          text='Add image'
          onClick={() => imageInputRef.current?.click()}
        />
      </Stack>
      <input
        ref={imageInputRef}
        type='file'
        accept='image/*'
        multiple
        style={{ display: 'none' }}
        onChange={(ev) => {
          addImageFiles(ev.currentTarget.files);
          ev.currentTarget.value = '';
        }}
      />
      <Stack
        horizontal
        wrap
        tokens={{ childrenGap: '4px 8px' }}
        onPaste={onPaste}
        onDragOver={(ev) => ev.preventDefault()}
        onDrop={(ev) => {
          ev.preventDefault();
          addImageFiles(ev.dataTransfer.files);
        }}
        style={{
          overflowX: 'hidden',
          overflowY: 'auto',
          padding: 4,
          minHeight: 80,
          maxHeight: 132,
          backgroundColor: appTheme.palette.neutralQuaternary,
          border: `1px dashed ${appTheme.semanticColors.inputBorder}`,
        }}
      >
        {images.length === 0 && <div style={{ color: appTheme.palette.neutralSecondaryAlt, padding: 8 }}>
          Paste screenshots into the message field, drop images here, or add image files.
        </div>}
        {images.map((img, idx) => {
          return <div key={idx} style={{ position: 'relative' }}>
            <img
              src={img}
              alt='Pasted'
              style={{
                maxWidth: '120px',
                maxHeight: '60px',
                border: `1px dotted ${appTheme.semanticColors.inputBorder}`
              }} />
            <IconButton
              className={cn.bBox}
              iconProps={{ iconName: 'Delete' }}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                backgroundColor: 'rgba(0,0,0,0.8)',
                width: 22,
                height: 22,
              }}
              onClick={() => {
                setImages(images.filter((_, i) => i !== idx));
              }}
            />
          </div>
        })}
      </Stack>

      <Stack horizontal horizontalAlign='end' tokens={{ childrenGap: appTheme.spacing.l2 }} style={{ marginTop: appTheme.spacing.l2 }}>
        {sending && <Spinner label='Thank you, sending ...' labelPosition='right' />}
        <PrimaryButton
          text='Send Feedback'
          disabled={sending || !message}
          onClick={onSend}
        />
        <DefaultButton
          text='Cancel'
          onClick={props.onDismiss}
        />
      </Stack>
    </div>
  </Modal>;
};
