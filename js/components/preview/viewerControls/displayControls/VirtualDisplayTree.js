import React, { memo, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, ExpandMore } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { makeStyles } from '../../../../ui/styles';
import { useRegisteredNodeRef } from '../../../../hooks/useRegisteredNodeRef';
import { VIEWS } from '../../../../constants/constants';
import { SELECTION_TYPE } from '../../../nglView/constants';

export const DISPLAY_ROW_HEIGHT = 40;
const OVERSCAN = 4;

export const representationRowId = (parentKey, representation, index) =>
  JSON.stringify(['representation', parentKey, representation.uuid ?? representation.lastKnownID ?? index]);

export const sortedRepresentations = object =>
  [...(object.representations || [])].sort((a, b) => (a.lastKnownID > b.lastKnownID ? 1 : -1));

export const displayTreeRows = (objects, expanded) => {
  const keys = Object.keys(objects)
    .filter(
      key => objects[key].display_div === VIEWS.MAJOR_VIEW && objects[key].selectionType !== SELECTION_TYPE.VECTOR
    )
    .sort((a, b) => a.localeCompare(b));
  const rows = [];
  keys.forEach((parentKey, parentIndex) => {
    const object = objects[parentKey];
    const parentId = JSON.stringify(['object', parentKey]);
    rows.push({
      id: parentId,
      parentKey,
      label: object.name || parentKey,
      level: 1,
      position: parentIndex + 1,
      siblings: keys.length,
      expandable: object.representations?.length > 0,
      expanded: expanded.has(parentId)
    });
    if (expanded.has(parentId)) {
      const representations = sortedRepresentations(object);
      representations.forEach((representation, index) =>
        rows.push({
          id: representationRowId(parentKey, representation, index),
          parentId,
          parentKey,
          label: `${object.name} ${representation.type}`,
          representation,
          representationIndex: index,
          level: 2,
          position: index + 1,
          siblings: representations.length
        })
      );
    }
  });
  return rows;
};

const useStyles = makeStyles(theme => ({
  root: { overflow: 'auto', height: '100%', minHeight: 120, width: 440, maxWidth: 'calc(100vw - 32px)', outline: 0 },
  row: { display: 'flex', alignItems: 'center', boxSizing: 'border-box', borderRadius: 4, cursor: 'pointer' },
  selected: { backgroundColor: theme.palette.action.selected },
  focused: { outline: `1px solid ${theme.palette.primary.main}`, outlineOffset: -1 },
  label: { flex: 1, minWidth: 0 },
  disclosure: { width: 28, flexShrink: 0 }
}));

const isControl = target => target.closest?.('button,input,select,textarea,[role="combobox"],[contenteditable="true"]');

export const VirtualDisplayTree = memo(({ objects, open, pinnedRowId, renderObject, renderRepresentation }) => {
  const classes = useStyles();
  const prefix = useId();
  const { nodeRef, setNodeRef } = useRegisteredNodeRef('display-controls-tree');
  const [expanded, setExpanded] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [focused, setFocused] = useState(null);
  const [hasFocus, setHasFocus] = useState(false);
  const [firstRow, setFirstRow] = useState(0);
  const [height, setHeight] = useState(480);
  const anchor = useRef({ id: null, offset: 0, top: 0 });
  const search = useRef({ text: '', time: 0 });
  const rows = useMemo(() => displayTreeRows(objects, expanded), [objects, expanded]);
  const indices = useMemo(() => new Map(rows.map((row, index) => [row.id, index])), [rows]);
  const activeId = indices.has(focused) ? focused : rows[0]?.id;

  const rememberScroll = top => {
    const index = Math.floor(top / DISPLAY_ROW_HEIGHT);
    anchor.current = { id: rows[index]?.id, offset: top % DISPLAY_ROW_HEIGHT, top };
    setFirstRow(previous => (previous === index ? previous : index));
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    const node = nodeRef.current;
    const measure = () => {
      if (node.clientHeight > 0) setHeight(previous => (previous === node.clientHeight ? previous : node.clientHeight));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, nodeRef]);

  useLayoutEffect(() => {
    if (!open) return;
    const node = nodeRef.current;
    const index = indices.get(anchor.current.id);
    const requested = index === undefined ? anchor.current.top : index * DISPLAY_ROW_HEIGHT + anchor.current.offset;
    const top = Math.max(0, Math.min(requested, rows.length * DISPLAY_ROW_HEIGHT - height));
    node.scrollTop = top;
    anchor.current = { id: rows[Math.floor(top / DISPLAY_ROW_HEIGHT)]?.id, offset: top % DISPLAY_ROW_HEIGHT, top };
    setFirstRow(previous =>
      previous === Math.floor(top / DISPLAY_ROW_HEIGHT) ? previous : Math.floor(top / DISPLAY_ROW_HEIGHT)
    );
  }, [open, rows, indices, height, nodeRef]);

  const focusRow = index => {
    const row = rows[index];
    if (!row) return;
    const node = nodeRef.current;
    const top = index * DISPLAY_ROW_HEIGHT;
    const nextTop =
      top < node.scrollTop
        ? top
        : top + DISPLAY_ROW_HEIGHT > node.scrollTop + height
        ? top + DISPLAY_ROW_HEIGHT - height
        : node.scrollTop;
    node.scrollTop = nextTop;
    rememberScroll(nextTop);
    setFocused(row.id);
    node.focus({ preventScroll: true });
  };
  const toggle = row =>
    setExpanded(previous => {
      const next = new Set(previous);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
  const onKeyDown = event => {
    if (isControl(event.target) || !rows.length) return;
    const index = indices.get(activeId) ?? 0;
    const row = rows[index];
    switch (event.key) {
      case 'ArrowDown':
        focusRow(Math.min(index + 1, rows.length - 1));
        break;
      case 'ArrowUp':
        focusRow(Math.max(index - 1, 0));
        break;
      case 'Home':
        focusRow(0);
        break;
      case 'End':
        focusRow(rows.length - 1);
        break;
      case 'PageDown':
        focusRow(Math.min(rows.length - 1, index + Math.max(1, Math.floor(height / DISPLAY_ROW_HEIGHT))));
        break;
      case 'PageUp':
        focusRow(Math.max(0, index - Math.max(1, Math.floor(height / DISPLAY_ROW_HEIGHT))));
        break;
      case 'ArrowRight':
        if (row.expandable && !row.expanded) toggle(row);
        else if (row.expanded && rows[index + 1]?.parentId === row.id) focusRow(index + 1);
        break;
      case 'ArrowLeft':
        if (row.expanded) toggle(row);
        else if (row.parentId) focusRow(indices.get(row.parentId));
        break;
      case 'Enter':
      case ' ':
        setSelected(row.id);
        if (row.expandable) toggle(row);
        break;
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        const time = Date.now();
        search.current = {
          text:
            time - search.current.time < 500 ? search.current.text + event.key.toLowerCase() : event.key.toLowerCase(),
          time
        };
        for (let distance = 1; distance <= rows.length; distance++) {
          const next = (index + distance) % rows.length;
          if (rows[next].label.toLowerCase().startsWith(search.current.text)) {
            focusRow(next);
            break;
          }
        }
      }
    }
    event.preventDefault();
  };

  const first = Math.min(firstRow, Math.max(0, rows.length - 1));
  const start = Math.max(0, first - OVERSCAN);
  const end = Math.min(rows.length, first + Math.ceil(height / DISPLAY_ROW_HEIGHT) + OVERSCAN);
  const visible = new Set(Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index));
  // Keep the focused item and an editor's DOM anchor alive outside the window.
  [activeId, pinnedRowId].forEach(id => {
    if (indices.has(id)) visible.add(indices.get(id));
  });

  return (
    <div
      role="tree"
      aria-label="Displayed structures"
      tabIndex={0}
      aria-activedescendant={activeId ? `${prefix}-${encodeURIComponent(activeId)}` : undefined}
      ref={setNodeRef}
      className={classes.root}
      data-testid="display-controls-tree"
      onScroll={event => rememberScroll(event.currentTarget.scrollTop)}
      onKeyDown={onKeyDown}
      onFocus={() => setHasFocus(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
      }}
    >
      <div style={{ position: 'relative', height: rows.length * DISPLAY_ROW_HEIGHT }}>
        {[...visible]
          .sort((a, b) => a - b)
          .map(index => {
            const row = rows[index];
            return (
              <div
                key={row.id}
                id={`${prefix}-${encodeURIComponent(row.id)}`}
                role="treeitem"
                aria-label={row.label}
                aria-level={row.level}
                aria-posinset={row.position}
                aria-setsize={row.siblings}
                aria-expanded={row.expandable ? row.expanded : undefined}
                aria-selected={selected === row.id}
                data-display-row-id={row.id}
                className={`${classes.row} ${selected === row.id ? classes.selected : ''} ${
                  hasFocus && activeId === row.id ? classes.focused : ''
                }`}
                style={{
                  position: 'absolute',
                  top: index * DISPLAY_ROW_HEIGHT,
                  height: DISPLAY_ROW_HEIGHT,
                  width: '100%',
                  paddingLeft: row.level === 2 ? 32 : 0
                }}
                onFocus={() => setFocused(row.id)}
                onClick={event => {
                  if (isControl(event.target)) return;
                  setSelected(row.id);
                  focusRow(index);
                  if (row.expandable) toggle(row);
                }}
              >
                {row.level === 1 && (
                  <div className={classes.disclosure}>
                    {row.expandable && (
                      <IconButton
                        size="small"
                        tabIndex={-1}
                        aria-label={`${row.expanded ? 'Collapse' : 'Expand'} ${row.label}`}
                        onClick={event => {
                          event.stopPropagation();
                          focusRow(index);
                          toggle(row);
                        }}
                      >
                        {row.expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                      </IconButton>
                    )}
                  </div>
                )}
                <div className={classes.label}>{row.level === 1 ? renderObject(row) : renderRepresentation(row)}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
});
