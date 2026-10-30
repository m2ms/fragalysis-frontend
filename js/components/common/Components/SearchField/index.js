import React, { useEffect, useMemo, useRef } from 'react';
import { TextField, InputAdornment, IconButton } from '../../../../ui';
import { Search } from '../../../../ui/icons';
import { makeStyles } from '../../../../ui/styles';
import classNames from 'classnames';
import { debounce } from 'lodash';
import RichTooltip from '../../../tooltip/RichTooltip';

const useStyles = makeStyles(theme => ({
  search: {
    fontSize: theme.typography.pxToRem(13),
    margin: `0 ${theme.spacing(1)}`,
    '& .MuiInputBase-root': {
      color: theme.palette.white
    },
    '& .MuiInput-underline:before': {
      borderBottomColor: theme.palette.white
    },
    '& .MuiInput-underline:after': {
      borderBottomColor: theme.palette.white
    },
    '& :before': {
      bottom: -2
    },
    '& :after': {
      bottom: -2
    }
  },
  input: {
    height: '1em',
    padding: '4px 0 4px',
    fontSize: theme.typography.pxToRem(13)
  }
}));

const SearchField = ({
  className,
  id,
  placeholder,
  size,
  onChange,
  disabled,
  searchString,
  resetKey,
  searchIconAction = null
}) => {
  const classes = useStyles();
  let value = searchString ?? '';
  const pending = useRef(null);

  useEffect(() => {
    if (resetKey === undefined) return;
    pending.current?.cancel();
    return () => pending.current?.cancel();
  }, [resetKey]);

  const debounced = useMemo(
    () =>
      debounce(value => {
        onChange(value);
      }, 1000),
    [onChange]
  );

  const onChangeDebounced = event => {
    const value = event.target.value || null;
    if (resetKey !== undefined) {
      pending.current?.cancel();
      pending.current = debounced;
    }
    debounced(value);
  };

  return (
    <RichTooltip path="search">
      <TextField
        className={classNames(classes.search, className)}
        id={id}
        placeholder={placeholder ?? 'Search tags'}
        size={size}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                {searchIconAction ? (
                  <IconButton
                    color="inherit"
                    sx={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={() => searchIconAction(true)}
                  >
                    <Search color="inherit" />
                  </IconButton>
                ) : (
                  <Search color="inherit" />
                )}
              </InputAdornment>
            ),
            className: classes.input
          }
        }}
        onChange={onChangeDebounced}
        disabled={disabled}
        defaultValue={value ?? ''}
        key={resetKey === undefined ? value : `${resetKey}:${value}`}
      />
    </RichTooltip>
  );
};

export default SearchField;
