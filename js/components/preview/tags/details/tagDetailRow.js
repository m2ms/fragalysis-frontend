import React, { memo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CATEGORY_TYPE_BY_ID } from '../../../../constants/constants';
import TagView from '../tagView';
import {
  getMoleculeTagForTag,
  getAllTagsForMol,
  getDefaultTagDiscoursePostText
} from '../utils/tagUtils';
import { DJANGO_CONTEXT } from '../../../../utils/djangoContext';
import {
  displayInListForTag,
  hideInListForTag,
  updateTagProp,
  selectTag,
  unselectTag,
  removeSelectedTag,
  addSelectedTag
} from '../redux/dispatchActions';
import {
  Grid,
  Tooltip,
  makeStyles,
  Button,
  Typography,
  IconButton
} from '@material-ui/core';
import { Edit } from '@material-ui/icons';
import { isURL } from '../../../../utils/common';
import classNames from 'classnames';
import { createTagPost, isDiscourseAvailable } from '../../../../utils/discourse';
import { setTagToEdit } from '../../../../reducers/selection/actions';

const useStyles = makeStyles(theme => ({
  contColButton: {
    minWidth: 'fit-content',
    paddingLeft: theme.spacing(1) / 4,
    paddingRight: theme.spacing(1) / 4,
    paddingBottom: 0,
    paddingTop: 0,
    fontWeight: 'bold',
    fontSize: 9,
    borderRadius: 7,
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light,
    '&:disabled': {
      borderRadius: 0,
      borderColor: 'white'
    },
    '&:hover': {
      backgroundColor: theme.palette.primary.light
    }
  },
  contColButtonSelected: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.main
    }
  },
  contColButtonHalfSelected: {
    backgroundColor: theme.palette.primary.semidark,
    color: theme.palette.primary.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.black
    }
  },
  divContainer: {
    flexDirection: 'row',
    display: 'flex',
    // height: '100%',
    width: '100%'
    /*paddingTop: theme.spacing(1) / 2,
    marginRight: '1px',
    marginLeft: '1px'*/
  },
  editButton: {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.success.dark,
      color: theme.palette.success.contrastText
    }
  }
}));

/**
 * TagDetailRow represents a row of TagDetails panel summary
 */
const TagDetailRow = memo(({ tag, moleculesToEditIds, moleculesToEdit, tagList }) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const targetName = useSelector(state => state.apiReducers.target_on_name);
  const displayAllInList = useSelector(state => state.selectionReducers.listAllList);
  // const moleculeTags = useSelector(state => state.apiReducers.moleculeTags);
  const selectedTagList = useSelector(state => state.selectionReducers.selectedTagList);

  const handleSelectHits = tag => {
    // TODO add all tag molecules to edit
    if (isTagDislayedInList(tag)) {
      dispatch(hideInListForTag(tag));
      dispatch(unselectTag(tag));
    } else {
      dispatch(displayInListForTag(tag));
      dispatch(selectTag(tag));
    }
  };

  const handleTagClick = (selected, tag) => {
    if (selected) {
      dispatch(removeSelectedTag(tag));
    } else {
      dispatch(addSelectedTag(tag));
    }
  };

  const isTagDislayedInList = tag => {
    return displayAllInList.includes(tag.id);
  };

  const handleEditTag = (tag) => {
    dispatch(setTagToEdit(tag));
  };

  return (
    <Grid
      container
      item
      className={classes.divContainer}
      spacing={1}
      wrap="nowrap"
      alignItems="center"
      xs={12}
    >
      <Grid item xs={3}>
        <TagView
          key={`tag-item-editor${tag.id}`}
          tag={tag}
          selected={selectedTagList.some(i => i.id === tag.id)}
          handleClick={handleTagClick}
          disabled={!DJANGO_CONTEXT.pk}
          isEdit={true}
          isTagEditor={true}
        ></TagView>
      </Grid>
      <Grid item xs={1}>
        <Tooltip title={CATEGORY_TYPE_BY_ID[tag.category_id]}>
          <Typography variant="body2">
            {CATEGORY_TYPE_BY_ID[tag.category_id]}
          </Typography>
        </Tooltip>
      </Grid>
      <Grid item xs={2}>
        <Tooltip title="Select hits">
          <Grid item>
            <Button
              variant="outlined"
              className={classNames(classes.contColButton, {
                [classes.contColButtonSelected]: isTagDislayedInList(tag),
                [classes.contColButtonHalfSelected]: false
              })}
              onClick={() => handleSelectHits(tag)}
              disabled={!DJANGO_CONTEXT.pk}
            >
              {isTagDislayedInList(tag) ? "Unselect hits" : "Select hits"}
            </Button>
          </Grid>
        </Tooltip>
      </Grid>
      <Grid item xs={2}>
        <Tooltip title="Discourse link">
          <Grid item>
            <Button
              variant="outlined"
              className={classNames(classes.contColButton, {
                [classes.contColButtonSelected]: false,
                [classes.contColButtonHalfSelected]: false
              })}
              onClick={() => {
                if (isURL(tag.discourse_url)) {
                  window.open(tag.discourse_url, '_blank');
                } else {
                  createTagPost(tag, targetName, getDefaultTagDiscoursePostText(tag)).then(resp => {
                    const tagURL = resp.data['Post url'];
                    tag['discourse_url'] = tagURL;
                    dispatch(updateTagProp(tag, tagURL, 'discourse_url'));
                    window.open(tag.discourse_url, '_blank');
                  });
                }
              }}
              disabled={!isDiscourseAvailable()}
            >
              Discourse
            </Button>
          </Grid>
        </Tooltip>
      </Grid>
      <Grid item xs={1}>
        <Typography variant="body2">
          {tag.user_id}
        </Typography>
      </Grid>
      <Grid item xs={2}>
        <Typography variant="body2" noWrap>
          {navigator.language ?
            (new Date(tag.create_date)).toLocaleDateString(navigator.language) :
            (new Date(tag.create_date)).toLocaleDateString()
          }
        </Typography>
      </Grid>
      <Grid item xs={1}>
        {/*<Tooltip title="Edit">
          <Grid item>
            <Button
              variant="contained"
              className={classes.editButton}
              size="small"
              onClick={() => handleEditTag(tag)}
              disabled={!DJANGO_CONTEXT.pk}
            >
              Edit
            </Button>
          </Grid>{theme.palette.error.light}
        </Tooltip>*/}
        <IconButton
          variant="contained"
          className={classes.editButton}
          size="small"
          onClick={() => handleEditTag(tag)}
          disabled={!DJANGO_CONTEXT.pk}
          aria-label="edit tag"
        >
          <Tooltip title="Edit">
            <Edit />
          </Tooltip>
        </IconButton>
      </Grid>
    </Grid>
  );
});

export default TagDetailRow;
