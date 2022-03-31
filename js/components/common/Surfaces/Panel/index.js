import React, { forwardRef, memo, useEffect, useState } from 'react';
import {
  Paper as MaterialPaper,
  makeStyles,
  Grid,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip
} from '@material-ui/core';
import ExpandMore from '@material-ui/icons/ExpandMore';
import ExpandLess from '@material-ui/icons/ExpandLess';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: theme.palette.background.paper,
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  body: {
    padding: theme.spacing(1),
    overflow: 'auto'
  },
  bodyOverflowHeader: {
    padding: theme.spacing(1),
    // 100% - header
    height: `calc( 100% - ${theme.spacing(5)}px )`,
    overflow: 'auto'
  },
  bodyOverflow: {
    padding: theme.spacing(1),
    height: `100%`,
    overflow: 'auto'
  },
  header: {
    color: theme.palette.white,
    backgroundColor: theme.palette.primary.main,
    height: theme.spacing(5),
    borderTopLeftRadius: theme.spacing(1) / 2,
    borderTopRightRadius: theme.spacing(1) / 2
  },
  headerSecondary: {
    color: theme.palette.white,
    backgroundColor: theme.palette.secondary.main,
    height: theme.spacing(5),
    borderTopLeftRadius: theme.spacing(1) / 2,
    borderTopRightRadius: theme.spacing(1) / 2
  },
  headerTitle: {
    paddingLeft: theme.spacing(1)
  },
  headerGrid: {
    height: 'inherit',
    flexWrap: 'nowrap'
  },
  hidden: {
    height: 0,
    display: 'none'
  },
  loading: {
    paddingTop: theme.spacing(2)
  },
  actionsContainer: {
    flexWrap: 'nowrap',
    justifyContent: 'flex-end'
  }
}));

export const Panel = memo(
  forwardRef(
    (
      {
        hasHeader,
        secondaryBackground,
        title,
        withTooltip,
        headerActions,
        hasExpansion,
        defaultExpanded = false,
        onExpandChange,
        children,
        bodyOverflow,
        isLoading,
        ...rest
      },
      ref
    ) => {
      const classes = useStyles();
      const [expanded, setExpanded] = useState(defaultExpanded);

      let bodyClass = classes.body;
      if (bodyOverflow) {
        if (hasHeader) {
          bodyClass = classes.bodyOverflowHeader;
        } else {
          bodyClass = classes.bodyOverflow;
        }
      }

      const handleTitleButtonClick = () => {
        setExpanded(!expanded);
      };

      useEffect(() => {
        if (onExpandChange) {
          onExpandChange(expanded);
        }
      }, [expanded, onExpandChange]);

      return (
        <MaterialPaper className={classes.root} ref={ref} {...rest}>
          {hasHeader && (
            <div className={secondaryBackground ? classes.headerSecondary : classes.header}>
              <Grid
                container
                justify="space-between"
                direction="row"
                alignItems="center"
                className={classes.headerGrid}
              >
                {title && (
                  <Grid item className={classes.headerTitle}>
                    {withTooltip ? (
                      <Tooltip title={title}>
                        <Typography variant="h6" color="inherit" noWrap>
                          {title}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="h6" color="inherit" noWrap>
                        {title}
                      </Typography>
                    )}
                  </Grid>
                )}
                {(headerActions || hasExpansion) && (
                  <Grid item>
                    <Grid container direction="row" className={classes.actionsContainer}>
                      {headerActions &&
                        headerActions.map((action, index) => (
                          <Grid item key={index}>
                            {action}
                          </Grid>
                        ))}
                      {hasExpansion && (
                        <IconButton onClick={handleTitleButtonClick} color="inherit">
                          {expanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </div>
          )}

          {hasExpansion && (
            <div className={expanded === true ? bodyClass : classes.hidden}>
              {isLoading && (
                <Grid container alignItems="center" justify="center" className={classes.loading}>
                  <Grid item>
                    <CircularProgress />
                  </Grid>
                </Grid>
              )}
              {children}
            </div>
          )}
          {!hasExpansion && (
            <div className={bodyClass}>
              {isLoading && (
                <Grid container alignItems="center" justify="center" className={classes.loading}>
                  <Grid item>
                    <CircularProgress />
                  </Grid>
                </Grid>
              )}
              {children}
            </div>
          )}
        </MaterialPaper>
      );
    }
  )
);
