import React, { memo } from 'react';
import Modal from '../../common/Modal';
import { useDispatch, useSelector } from 'react-redux';
import { setProjectModalOpen } from '../redux/actions';
import { makeStyles, RadioGroup, Radio, Grid, Typography, TextField, Chip, Select, MenuItem } from '@material-ui/core';
import { AccountCircle, Title, Description, Label, Link } from '@material-ui/icons';
import { DJANGO_CONTEXT } from '../../../utils/djangoContext';
import { InputFieldAvatar } from './inputFieldAvatar';
import { ProjectCreationType } from '../redux/constants';

const useStyles = makeStyles(theme => ({
  body: {
    width: '100%',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  input: {
    width: 400
  },
  margin: {
    margin: theme.spacing(1)
  },
  formControl: {
    margin: theme.spacing(3)
  }
}));

export const ProjectModal = memo(({}) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const isProjectModalOpen = useSelector(state => state.projectReducers.isProjectModalOpen);
  const targetList = useSelector(state => state.apiReducers.target_id_list);

  const [value, setValue] = React.useState(ProjectCreationType.NEW);

  const [age, setAge] = React.useState('');
  const handleChangeTarget = event => {
    setAge(event.target.value);
  };

  const handleChange = event => {
    setValue(event.target.value);
  };

  const handleCloseModal = () => dispatch(setProjectModalOpen(false));

  const [chipData, setChipData] = React.useState(['Custom tag']);

  const handleDelete = chipToDelete => () => {
    setChipData(chips => chips.filter(chip => chip.key !== chipToDelete.key));
  };

  return (
    <Modal open={isProjectModalOpen} onClose={handleCloseModal}>
      <Typography variant="h3">Create project</Typography>
      <form noValidate autoComplete="off">
        <Grid container direction="column" className={classes.body}>
          <Grid item>
            <RadioGroup aria-label="gender" name="gender1" value={value} onChange={handleChange}>
              <Grid container justify="space-between" className={classes.input}>
                <Grid item>
                  New Project
                  <Radio value={ProjectCreationType.NEW} />
                </Grid>
                <Grid item>
                  From Snapshot
                  <Radio value={ProjectCreationType.FROM_SNAPSHOT} />
                </Grid>
              </Grid>
            </RadioGroup>
          </Grid>
          <Grid item>
            <InputFieldAvatar
              icon={<Title />}
              field={<TextField className={classes.input} id="title" label="Title" />}
            />
          </Grid>
          <Grid item>
            <InputFieldAvatar
              icon={<Description />}
              field={<TextField className={classes.input} id="description" label="Description" />}
            />
          </Grid>
          <Grid item>
            <InputFieldAvatar
              icon={<AccountCircle />}
              field={
                <TextField
                  className={classes.input}
                  id="author"
                  label="Author"
                  value={DJANGO_CONTEXT['username']}
                  disabled
                />
              }
            />
          </Grid>
          <Grid item>
            <InputFieldAvatar
              icon={<Link />}
              field={
                <Select
                  labelId="demo-simple-select-label"
                  value={age}
                  onChange={handleChangeTarget}
                  className={classes.input}
                  id="target"
                  label="Target"
                >
                  {targetList.map(target => (
                    <MenuItem key={target.id} value={target.id}>
                      {target.title}
                    </MenuItem>
                  ))}
                </Select>
              }
            />
          </Grid>
          <Grid item>
            <InputFieldAvatar
              icon={<Label />}
              field={
                <TextField
                  className={classes.input}
                  id="tags"
                  label="Tags"
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setChipData([...chipData, e.target.value]);
                    }
                  }}
                />
              }
            />
          </Grid>
          <Grid item>
            <InputFieldAvatar
              icon={<Link style={{ opacity: 0 }} />}
              field={chipData.map((data, index) => (
                <Chip key={index} label={data} onDelete={handleDelete(data)} />
              ))}
            />
          </Grid>
        </Grid>
      </form>
    </Modal>
  );
});
