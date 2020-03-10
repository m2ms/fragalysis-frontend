import React, { memo, useRef } from 'react';
import { Panel } from '../../common/Surfaces/Panel';
import { ComputeSize } from '../../../utils/computeSize';
import { Grid, IconButton, Typography, Table, TableBody, TableRow, TableCell, TableHead } from '@material-ui/core';
import { templateExtend, TemplateName, Orientation, Gitgraph } from '@gitgraph/react';
import { Delete, Share, MoreVert } from '@material-ui/icons';
import moment from 'moment';
import { useSelector } from 'react-redux';

export const ProjectHistory = memo(({ height, setHeight, showFullHistory }) => {
  const panelRef = useRef(undefined);
  const snapshotDetail = useSelector(state => state.projectReducers.snapshotDetail);

  const template = templateExtend(TemplateName.Metro, {
    branch: {
      lineWidth: 3,
      spacing: 25,
      label: {
        font: 'normal 8pt Arial',
        pointerWidth: 100
        //  display: false
      }
    },
    commit: {
      message: {
        displayHash: false,
        font: 'normal 10pt Arial',
        displayAuthor: false
      },
      spacing: 15,
      dot: {
        size: 8
      }
    },
    tag: {
      font: 'normal 8pt Arial'
    }
  });

  const options = {
    template,
    orientation: Orientation.Horizontal
  };

  const handleClickOnCommit = commit => {
    console.log('redirecting to session');
    // history.push(`${URLS.target}NUDT5A`);
  };

  const commitFunction = ({ title, description, photo, author, email }) => ({
    subject: `${title}`,
    body: (
      <>
        <IconButton>
          <Share />
        </IconButton>
        <IconButton>
          <Delete />
        </IconButton>
        <br />
        <Typography variant="caption">
          <b>{`${moment().format('LLL')}, ${email}: `}</b>
          {description}
        </Typography>
      </>
    ),
    onMessageClick: handleClickOnCommit,
    onClick: handleClickOnCommit
  });

  function createData(name, calories, fat, carbs, protein) {
    return { name, calories, fat, carbs, protein };
  }

  return (
    <Panel
      hasHeader
      title="Project History"
      ref={panelRef}
      headerActions={[
        <IconButton color="inherit" onClick={showFullHistory}>
          <MoreVert />
        </IconButton>
      ]}
    >
      <ComputeSize componentRef={panelRef.current} setHeight={setHeight} height={height} forceCompute>
        <Grid container direction="column" alignItems="center">
          <Grid item>
            <Gitgraph options={options}>
              {gitgraph => {
                const master = gitgraph.branch('Basic molecules');
                master.commit(
                  commitFunction({
                    title: 'Add basic molecules',
                    description: 'Add all molecules are in base form',
                    author: 'Tibor Postek',
                    email: 'tibor.postek@m2ms.sk'
                  })
                );
                const majorSnapshot = gitgraph.branch('Major molecule functionality');
                majorSnapshot.commit(
                  commitFunction({
                    title: 'Major snapshop',
                    description: 'Create all major interactions are implemented',
                    author: 'Pavol Brunclik',
                    email: 'pavol.brunclik@m2ms.sk'
                  })
                );
                const cancerMolecules = gitgraph.branch('Cancer branch molecules');
                cancerMolecules.commit(
                  commitFunction({
                    title: 'Add cancer molecule models',
                    description: 'Base model and 3 options are available',
                    author: 'Pavol Brunclik',
                    email: 'pavol.brunclik@m2ms.sk'
                  })
                );
                cancerMolecules.commit(
                  commitFunction({
                    title: 'Add cancer molecule',
                    description: 'This molecule is rare and expensive',
                    author: 'Tibor Postek',
                    email: 'tibor.postek@m2ms.sk'
                  })
                );
                cancerMolecules.commit(
                  commitFunction({
                    title: 'Add medical experiment',
                    description: 'Testing molecules for fighting with cancer',
                    author: 'Tibor Postek',
                    email: 'tibor.postek@m2ms.sk'
                  })
                );
                cancerMolecules.commit(
                  commitFunction({
                    title: 'Add biological experiment',
                    description: 'Testing molecules on animals, that are disabled by with cancer',
                    author: 'Tibor Postek',
                    email: 'tibor.postek@m2ms.sk'
                  })
                );

                majorSnapshot.commit(
                  commitFunction({
                    title: 'Create automatic snapshop',
                    description: 'Automatic generated snapshot',
                    author: 'Pavol Brunclik',
                    email: 'pavol.brunclik@m2ms.sk'
                  })
                );

                master.commit(
                  commitFunction({
                    title: 'Add methods',
                    description: 'Add method of molecules molecule verification',
                    author: 'Tibor Postek',
                    email: 'tibor.postek@m2ms.sk'
                  })
                );
              }}
            </Gitgraph>
          </Grid>
          <Grid item>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell align="right">Author</TableCell>
                  <TableCell align="right">Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell component="th" scope="row">
                    {snapshotDetail.name}
                  </TableCell>
                  <TableCell align="right">
                    {snapshotDetail.author && snapshotDetail.author.username},
                    {snapshotDetail.author && snapshotDetail.author.email}
                  </TableCell>
                  <TableCell align="right">
                    {snapshotDetail.created && moment(snapshotDetail.created).format('LLL')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Grid>
        </Grid>
      </ComputeSize>
    </Panel>
  );
});
