/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJECT_ID: string;
  // add other env vars if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}