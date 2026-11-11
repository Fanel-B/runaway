import { useEffect, useState } from 'react';
import { Dialog } from './Dialog.jsx';

function inline(text) {
  // Only **bold** and `code`; everything stays escaped text rendered by React.
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function Markdown({ source }) {
  const blocks = [];
  let list = null;
  let code = null;
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) blocks.push(<p key={blocks.length}>{inline(paragraph.join(' '))}</p>);
    paragraph = [];
    if (list)
      blocks.push(
        <ul key={blocks.length}>
          {list.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>,
      );
    list = null;
  };
  for (const line of source.split(/\r?\n/)) {
    if (code) {
      if (line.startsWith('```')) {
        blocks.push(
          <pre key={blocks.length}>
            <code>{code.join('\n')}</code>
          </pre>,
        );
        code = null;
      } else code.push(line);
      continue;
    }
    if (line.startsWith('```')) {
      flush();
      code = [];
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)/);
    if (heading) {
      flush();
      const Tag = `h${Math.min(heading[1].length + 2, 6)}`;
      blocks.push(<Tag key={blocks.length}>{inline(heading[2])}</Tag>);
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (paragraph.length) {
        blocks.push(<p key={blocks.length}>{inline(paragraph.join(' '))}</p>);
        paragraph = [];
      }
      (list ||= []).push(line.replace(/^\s*[-*]\s+/, ''));
    } else if (!line.trim()) {
      flush();
    } else if (list) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return <div className="markdown">{blocks}</div>;
}

export function JournalDialog({ open, onClose }) {
  const [source, setSource] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open || source) return;
    import('../../../JOURNAL_DES_MODIFICATIONS.md?raw')
      .then(module => setSource(module.default))
      .catch(() => setFailed(true));
  }, [open, source]);
  return (
    <Dialog open={open} onClose={onClose} title="Journal des modifications" eyebrow="Coulisses du projet" wide>
      <p className="muted">
        Ce que j’ai changé, pourquoi, et ce qui a réellement été vérifié. Fichier source :{' '}
        <code>JOURNAL_DES_MODIFICATIONS.md</code>.
      </p>
      {failed ? (
        <p className="notice notice-danger" role="alert">
          Le journal n’a pas pu être chargé.
        </p>
      ) : source ? (
        <Markdown source={source} />
      ) : (
        <p className="muted">Chargement du journal…</p>
      )}
    </Dialog>
  );
}
