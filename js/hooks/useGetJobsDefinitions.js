// eslint-disable-next-line import/extensions
import fragmensteinSpec from '../../jobconfigs/fragmenstein-combine.json';
// eslint-disable-next-line import/extensions
import jobsSpec from '../../jobconfigs/fragalysis-job-spec-1.1.json';

// Merges job definitions with fragalysis-jobs definitions
const getSchemaDefinition = (jobLauncherData, configDefinitions, overrideDefinitions) => {
  const mergedDefinitions = { ...configDefinitions };
  console.log(jobLauncherData);

  Object.entries(overrideDefinitions).forEach(([key, overrideDefinition]) => {
    let mergedDefinition = mergedDefinitions[key] || {};

    const { from, ...rest } = overrideDefinition;

    // If fragalysis-jobs definitions contain from, expand it from the provided data
    if (!!from) {
      const items = jobLauncherData?.data?.[from] || {};
      if (rest.type === 'array') {
        mergedDefinition = { ...mergedDefinition, items };
      } else {
        mergedDefinition = { ...mergedDefinition, ...items };
      }
    }

    mergedDefinitions[key] = { ...mergedDefinition, ...rest };
  });

  return mergedDefinitions;
};

export const useGetJobsDefinitions = jobLauncherData => {
  const selectedJob = fragmensteinSpec;

  const inputs = JSON.parse(selectedJob.variables.inputs);
  const options = JSON.parse(selectedJob.variables.options);
  const outputs = JSON.parse(selectedJob.variables.outputs);

  const jobOverrides = jobsSpec['fragalysis-jobs'].find(job => job.job_name === selectedJob.job);

  // Prepare schema
  const schema = {
    type: options.type,
    required: [...(inputs.required || []), ...(options.required || []), ...(outputs.required || [])],
    properties: {
      ...getSchemaDefinition(jobLauncherData, inputs.properties || {}, jobOverrides?.inputs || {}),
      ...getSchemaDefinition(jobLauncherData, options.properties || {}, jobOverrides?.options || {}),
      ...getSchemaDefinition(jobLauncherData, outputs.properties || {}, jobOverrides?.outputs || {})
    }
  };

  // Prepare UI schema
  const uiSchema = {
    ...(jobOverrides?.inputs || {}),
    ...(jobOverrides?.options || {}),
    ...(jobOverrides?.outputs || {})
  };

  console.log(uiSchema);

  return { schema, uiSchema };
};
