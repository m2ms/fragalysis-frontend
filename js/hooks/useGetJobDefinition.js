// eslint-disable-next-line import/extensions
import fragmensteinSpec from '../../jobconfigs/fragmenstein-combine.json';
// eslint-disable-next-line import/extensions
import jobsSpec from '../../jobconfigs/fragalysis-job-spec-1.1.json';

// Merges job definitions with fragalysis-jobs definitions
const getSchemaDefinition = (configDefinitions, overrideDefinitions) => {
  const mergedDefinitions = { ...configDefinitions };

  Object.entries(overrideDefinitions).forEach(([key, overrideDefinition]) => {
    let mergedDefinition = mergedDefinitions[key] || {};

    const { from, ...rest } = overrideDefinition;

    /*
    // If fragalysis-jobs definitions contain from, expand it from the provided data
    if (!!from) {
      const items = jobLauncherData?.data?.[from] || {};
      if (rest.type === 'array') {
        mergedDefinition = { ...mergedDefinition, items };
      } else {
        mergedDefinition = { ...mergedDefinition, ...items };
      }
    }*/

    mergedDefinitions[key] = { ...mergedDefinition, ...rest };
  });

  return mergedDefinitions;
};

export const useGetJobDefinition = () => {
  const selectedJob = fragmensteinSpec;

  const inputs = JSON.parse(selectedJob.variables.inputs);
  const options = JSON.parse(selectedJob.variables.options);
  const outputs = JSON.parse(selectedJob.variables.outputs);

  const jobOverrides = jobsSpec['fragalysis-jobs'].find(job => job.job_name === selectedJob.job);

  const jobDefinition = {
    inputs: {
      ...inputs,
      properties: getSchemaDefinition(inputs.properties || {}, jobOverrides?.inputs || {})
    },
    options: {
      ...options,
      properties: getSchemaDefinition(options.properties || {}, jobOverrides?.options || {})
    },
    outputs: {
      ...outputs,
      properties: getSchemaDefinition(outputs.properties || {}, jobOverrides?.outputs || {})
    }
  };

  return jobDefinition;
};
