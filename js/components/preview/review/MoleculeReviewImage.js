import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CircularProgress, Typography } from '../../../ui';
import { useRDKit } from '../../rdkit/RDKitContext';
import { generateAndStoreMolImage } from '../molecule/redux/dispatchActions';
import { MOL_TYPE } from '../molecule/redux/constants';
import { getRhsFilterSmileQuery } from './rhsObservationResult';
import { getReviewImage, rememberReviewImage } from './reviewImageCache';

export const MoleculeReviewImage = ({ observation, label }) => {
  const dispatch = useDispatch();
  const { RDKitModule, loading } = useRDKit();
  const { id, smiles } = observation;
  const target = useSelector(state => state.apiReducers.target_on);
  const query = useSelector(getRhsFilterSmileQuery);
  const cached = useSelector(state => state.previewReducers.molecule.imageCache[id]);
  const inputKey = JSON.stringify([target, id, smiles, query]);
  const [result, setResult] = useState(null);
  const image = (!query && cached) || (result?.key === inputKey && result.svg);
  const imageUrl = useMemo(() => (image ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image)}` : null), [
    image
  ]);

  useEffect(() => {
    if ((!query && cached) || !RDKitModule || !smiles) return undefined;
    let active = true;
    const generate = () => {
      if (!active) return;
      const previous = getReviewImage(inputKey);
      if (previous !== undefined) {
        setResult({ key: inputKey, svg: previous });
        return;
      }
      dispatch(generateAndStoreMolImage({ id, smiles }, MOL_TYPE.HIT, 180, 160, RDKitModule, query))
        .then(svg => {
          if (active) {
            rememberReviewImage(inputKey, svg);
            setResult({ key: inputKey, svg });
          }
        })
        .catch(() => {
          if (active) {
            rememberReviewImage(inputKey, null);
            setResult({ key: inputKey, svg: null });
          }
        });
    };
    const idle = typeof window.requestIdleCallback === 'function';
    const task = idle ? window.requestIdleCallback(generate, { timeout: 250 }) : window.setTimeout(generate, 0);
    return () => {
      active = false;
      if (idle) window.cancelIdleCallback(task);
      else window.clearTimeout(task);
    };
  }, [dispatch, id, smiles, RDKitModule, query, cached, inputKey]);

  if (imageUrl)
    return (
      <img src={imageUrl} alt={`Molecule ${label}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    );
  if (smiles && ((RDKitModule && result?.key !== inputKey) || loading)) {
    return <CircularProgress size={24} aria-label={`Loading molecule ${label}`} />;
  }
  return <Typography color="textSecondary">Molecule image unavailable</Typography>;
};
