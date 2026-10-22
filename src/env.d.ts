interface ImportMetaEnv {
  /** manifest of a local data build (README, "Development"); empty uses production */
  readonly PUBLIC_MANIFEST_URL?: string;
  /** meta.json of a local feeds build; empty uses production */
  readonly PUBLIC_FEEDS_META_URL?: string;
}
