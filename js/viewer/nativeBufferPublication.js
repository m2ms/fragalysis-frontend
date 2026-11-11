// Only initial representations explicitly registered by the adapter may defer
// publication. Native edits, maps and other viewer operations use their own path.
const publishers = new WeakMap();

export const registerNativeBufferPublisher = (representation, publish) => {
  publishers.set(representation, publish);
  return () => {
    if (publishers.get(representation) === publish) publishers.delete(representation);
  };
};

export const publishNativeBuffers = (representation, buffers, nativePublish) => {
  if (!publishers.get(representation)?.(buffers)) nativePublish();
};
