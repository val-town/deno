#!/usr/bin/env zx
// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.


const fs = require('fs/promises');

(async () => {
  const linuxTarget = "x86_64-unknown-linux-gnu";

  await Promise.all([
    $`cargo build --release`,
    $`cross build --target ${linuxTarget} --release`,
  ]);

  console.log();
  console.log("Compilation complete!");
  console.log();
  let currentTarget = await $`rustc -vV | sed -n 's|host: ||p'`;
  currentTarget = currentTarget.toString().trim();

  console.log(`currentTarget: "${currentTarget}"`);

  const previousReleases = JSON.parse(
    (await $`gh release list --json 'name,tagName'`).toString(),
  );
  let tag = previousReleases[0]["tagName"];
  tag = tag.replace(/\d+$/, (match) => parseInt(match, 10) + 1);


  const data = await fs.readFile("./cli/Cargo.toml", 'utf8');
  const versionLine = data.split('\n').find(line => line.startsWith('version ='));
  const version = versionLine.split('=')[1].trim().replace(/"/g, '');

  if (!tag.startsWith(`v${version}`)) {
    tag = `v${version}-vt.0`;
  }

  console.log(`Publishing with tag "${tag}"`);

  const linuxBin = `./target/${linuxTarget}/release/deno`;
  const linuxReleaseBin = `./target/${linuxTarget}/release/${linuxTarget}-deno`;
  const localBin = "./target/release/deno";
  const localReleaseBin = `./target/release/${currentTarget}-deno`;

  await $`cp ${localBin} ${localReleaseBin}`;
  await $`cp ${linuxBin} ${linuxReleaseBin}`;

  console.log("Uploading release and assets to GitHub...");
  await $`gh release create ${tag} -t ${tag} \
    --notes="" '${linuxReleaseBin}' '${localReleaseBin}'`;
})();
