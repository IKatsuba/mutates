module.exports = {
  '**/*.{,/cjs,mjs,js,ts,html,css,scss,sass,less,yml,yaml,json}': [
    (files) => `npx nx affected -t lint --files=${files.join(',')}`,
    (files) => `npx nx format:write --files=${files.join(',')}`,
  ],
};
