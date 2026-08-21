const unsupported = () => {
  throw new Error("HTTP client is disabled in standalone React mode");
};

export const http = {
  get: unsupported,
  post: unsupported,
  put: unsupported,
  delete: unsupported,
};
