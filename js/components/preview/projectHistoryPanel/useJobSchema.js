import { useGetJobDefinition } from '../../../hooks/useGetJobDefinition';

export const useJobSchema = jobLauncherData => {
  const { inputs, options, outputs } = useGetJobDefinition();

  // Prepare schema
  const schema = {
    type: options.type,
    required: [...(inputs.required || []), ...(options.required || []), ...(outputs.required || [])],
    properties: {
      ...inputs.properties,
      ...options.properties,
      ...outputs.properties
    }
  };

  // Prepare UI schema
  const uiSchema = {
    ...inputs.properties,
    ...options.properties,
    ...outputs.properties
  };

  return { schema, uiSchema };
};
