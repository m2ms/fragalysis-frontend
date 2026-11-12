// Classify pre-render failures without changing native Error identity or putting
// error/runtime references into Redux or saved snapshots.
const inputErrors = new WeakSet();

export const markMoleculeInputError = error => {
  const inputError =
    error !== null && (typeof error === 'object' || typeof error === 'function') ? error : new Error(String(error));
  inputErrors.add(inputError);
  return inputError;
};

export const isMoleculeInputError = error => inputErrors.has(error);
