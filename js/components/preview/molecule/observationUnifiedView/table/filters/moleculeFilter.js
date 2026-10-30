import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Checkbox, FormControl, FormControlLabel, GridLegacy as Grid, IconButton, Radio, RadioGroup, TextField } from '@mui/material';
import { makeStyles } from '../../../../../../ui/styles';
import { FilterWrapper } from './filterWrapper';
import { Search, SwitchAccessShortcut } from '@mui/icons-material';
import { Jsme } from '@loschmidt/jsme-react';
import { Button } from '@mui/material';
import { filterCompoundsByStructure } from '../../api';
import { useDispatch, useSelector } from 'react-redux';
import { setUnifiedFilterItem } from '../../../../../../reducers/selection/actions';
import { useRDKit } from '../../../../../rdkit/RDKitContext';
import { getFilterSmileQuery } from '../../../../../../reducers/selection/selectors';
import RichTooltip from '../../../../../tooltip/RichTooltip';
// import { Editor } from "ketcher-react";

const useStyles = makeStyles(theme => ({
  row: {
    padding: 2
  },
  smilesInput: {
    paddingLeft: 9
  },
  smilesLabel: {
    marginLeft: 7,
    fontSize: 12
  }
}));

const INITIAL_FILTER_VALUE = {
  matchType: 'exact',
  smarts: false,
  distinct: false,
  smiles: '',
  filteredCompounds: null,
  structureType: 'compound'
};

export const MoleculeFilter = memo(({ onFilterChange, viewConfig = {}, controlled = false, value }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { RDKitModule } = useRDKit();

  const SUBSTRUCTURE = 'substructure';
  const EXACT = 'exact';

  const targetOnId = useSelector(state => state.apiReducers.target_on);
  const restoreRevision = useSelector(state => (controlled ? state.selectionReducers.reviewRevision || 0 : 0));
  const targetList = useSelector(state => state.apiReducers.target_id_list);
  const targetAccessString = useSelector(state => state.targetReducers.currentProject?.target_access_string);
  const savedFilter = useSelector(state => state.selectionReducers.unifiedFilter?.molecule);
  const legacySmilesQuery = useSelector(getFilterSmileQuery);

  const targetOnTitle = useMemo(() => {
    const target = targetList.find(t => t.id === targetOnId);
    return target ? target.title : '';
  }, [targetList, targetOnId]);

  const [localFilterValue, setFilterValue] = useState(() => savedFilter || INITIAL_FILTER_VALUE);
  const [localEditorSmiles, setEditorSmiles] = useState(() => savedFilter?.smiles || '');
  const [localInputSmiles, setInputSmiles] = useState(() => savedFilter?.smiles || '');
  const filterValue = controlled ? (value || INITIAL_FILTER_VALUE) : localFilterValue;
  const editorSmiles = controlled ? filterValue.smiles : localEditorSmiles;
  const inputSmiles = controlled ? filterValue.smiles : localInputSmiles;
  const filteredSmilesQuery = controlled ? filterValue.smiles : legacySmilesQuery;
  const requestRef = useRef(0);
  const inputsRef = useRef(null);
  const requestInputs = JSON.stringify([targetOnId, targetAccessString, targetOnTitle, filterValue, restoreRevision]);
  inputsRef.current = requestInputs;
  useEffect(() => () => { requestRef.current += 1; }, []);

  const handleFilterChange = (property, value) => {
    const newFilterValue = {
      ...filterValue,
      [property]: value
    };
    if (!controlled) setFilterValue(newFilterValue);
    if (controlled) onFilterChange(newFilterValue);
    return newFilterValue;
  };

  const handleApplyFilter = () => {
    const request = ++requestRef.current;
    const applyMoleculeFilter = viewConfig.applyMoleculeFilter || filterCompoundsByStructure;

    applyMoleculeFilter({
      target: targetOnTitle,
      target_access_string: targetAccessString,
      query: filterValue.smiles,
      structure_type: filterValue.structureType,
      is_substructure: filterValue.matchType === SUBSTRUCTURE,
      is_smarts: filterValue.smarts,
      use_chirality: filterValue.distinct
    })
      .then(filteredCompounds => {
        if (controlled && (request !== requestRef.current || inputsRef.current !== requestInputs)) return;
        console.log(filteredCompounds);
        if (filteredCompounds) {
          const updatedFilter = handleFilterChange('filteredCompounds', filteredCompounds);
          if (!controlled) {
            onFilterChange(updatedFilter);
            dispatch(setUnifiedFilterItem('molecule', updatedFilter));
          }
        }
      })
      .catch(err => console.log(err));
  };

  const handleSmilesChange = smiles => {
    console.log(smiles);
    if (smiles !== null) {
      handleFilterChange('smiles', smiles);
      if (!controlled) setInputSmiles(smiles);
    } else {
      handleFilterChange('smiles', '');
      if (!controlled) setInputSmiles('');
    }
  };

  const handleApplyInputSmiles = () => {
    handleFilterChange('smiles', inputSmiles);
    if (!controlled) setEditorSmiles(inputSmiles);
  };

  const getOnHoverComponent = useCallback(() => {
    if (!RDKitModule || !filteredSmilesQuery) return null;
    const mol = RDKitModule.get_mol(filteredSmilesQuery);
    if (!mol) return null;
    const height = 120;
    const width = 150;
    const svg = mol.get_svg_with_highlights(JSON.stringify({ width, height }));
    mol.delete();
    return <div style={{ width, height }} dangerouslySetInnerHTML={{ __html: svg }}></div>;
  }, [RDKitModule, filteredSmilesQuery]);

  const [options] = useState(['query,fullScreenIcon']);

  return (
    <FilterWrapper
      title="Filter (Molecule)"
      handleReset={() => {
        if (!controlled) setEditorSmiles('');
        if (!controlled) setInputSmiles('');
        if (!controlled) setFilterValue(INITIAL_FILTER_VALUE);
        onFilterChange(INITIAL_FILTER_VALUE);
        if (!controlled) dispatch(setUnifiedFilterItem('molecule', INITIAL_FILTER_VALUE));
      }}
      isActive={filterValue.filteredCompounds !== null}
      onHoverComponent={getOnHoverComponent()}
    >
      {/** Options */}
      <Grid container direction="column">
        <Grid item xs>
          <FormControl>
            <RadioGroup value={filterValue.matchType} onChange={e => handleFilterChange('matchType', e.target.value)}>
              <FormControlLabel control={<Radio value={SUBSTRUCTURE} />} label="Substructure match" />
              <FormControlLabel control={<Radio value={EXACT} />} label="Exact match" />
            </RadioGroup>
          </FormControl>
        </Grid>
        <Grid item xs>
          <FormControlLabel
            control={
              <Checkbox checked={filterValue.smarts} onChange={e => handleFilterChange('smarts', e.target.checked)} />
            }
            label="SMARTs query"
          />
        </Grid>
        <Grid item xs>
          <FormControlLabel
            control={
              <Checkbox
                checked={filterValue.distinct}
                onChange={e => handleFilterChange('distinct', e.target.checked)}
              />
            }
            label="Treat stereoisomers as distinct"
          />
        </Grid>
        {/* <Grid item xs><Editor
                // ...rest of the properties
                disableMacromoleculesEditor
            /></Grid> */}
        <Grid item xs>
          {/* https://jsme-editor.github.io/dist/doc.html#OPTIONS */}
          {/* <Jsme height={320} width={370} /> */}
          <Jsme
            height={320}
            width={370}
            smiles={editorSmiles}
            options={options}
            onChange={smiles => handleSmilesChange(smiles)}
          />
          {/* <Jsme height={300} width={350} smiles="CC=O" onChange={handleEditorChange} /> */}
        </Grid>
        <Grid item xs>
          {/* <TextField value={options} placeholder="Enter options & re-open filter" onChange={(e) => setOptions(e.target.value)} /> */}
          {/* <a href={`https://jsme-editor.github.io/dist/doc.html#OPTIONS`} target="_blank" rel="noopener noreferrer">JSME Options</a>
                |
                <a href={`https://jsme-editor.github.io/help.html`} target="_blank" rel="noopener noreferrer">JSME Help</a> */}
          <FormControlLabel
            control={
              <TextField
                className={classes.smilesInput}
                value={inputSmiles}
                onChange={e => handleSmilesChange(e.target.value)}
              />
            }
            label="SMILES/SMARTs query"
            labelPlacement="start"
          />
          {/* <FormControlLabel control={<TextField value={smiles} />} label="SMILES/SMARTs query" labelPlacement="start" /> */}
          <RichTooltip path="moleculeFilter.updateEditor">
            <IconButton color="primary" onClick={handleApplyInputSmiles}>
              <SwitchAccessShortcut />
            </IconButton>
          </RichTooltip>
        </Grid>
        <Grid item xs>
          <RichTooltip path="moleculeFilter.applyFilter">
            <Button
              color="primary"
              // disabled={false}
              onClick={handleApplyFilter}
              startIcon={<Search />}
              variant="outlined"
              size="small"
            >
              Apply filter
            </Button>
          </RichTooltip>
          {filterValue.smiles && <span className={classes.smilesLabel}>for {filterValue.smiles}</span>}
        </Grid>
      </Grid>
    </FilterWrapper>
  );
});
