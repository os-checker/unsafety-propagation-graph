#!/bin/bash

set -eoux pipefail

cargo install --path . --locked --debug

export UPG_DIR=$PWD/target/upg
rm "$UPG_DIR" -rf
mkdir "$UPG_DIR"
mkdir "$UPG_DIR"/demo
mkdir "$UPG_DIR"/asterinas

export RUST_LOG=debug
export UPG_RUST_STD_LIBRARY=$(rustc --print=sysroot)/lib/rustlib/src/rust/library

export RAPX_STD_JSON=$PWD/assets/std.json
export RAPX_STD_MAPPING_DIR=$PWD/assets/fn_name_mapping
export RAPX_STD_SPEC=$PWD/assets/specs/sp-core.toml
export RAPX_STD_OUT=$PWD/data/tags/std.json

gen_std() {
  pushd tests/demo
  cargo clean
  # unset UPG_RUST_STD_LIBRARY
  # Generate $UPG_DIR/$crate
  UPG_DIR=$UPG_DIR/demo upg
  popd
}

gen_fn_name_mapping() {
  pushd tests/demo
  cargo clean
  UPG_DRIVER=upg-rapx-adpator upg
  cp "$UPG_DIR"/_rapx/core.json assets/fn_name_mapping/
  cp "$UPG_DIR"/_rapx/std.json assets/fn_name_mapping/
  cp "$UPG_DIR"/_rapx/alloc.json assets/fn_name_mapping/
  popd
}

gen_std_json() {
  # Generate std.json to $RAPX_STD_OUT
  export LD_LIBRARY_PATH=$(rustc --print sysroot)/lib
  UPG_RAPX_CONVERT=1 SP_FILE="$RAPX_STD_SPEC" upg-rapx-adpator
}

gen_data() {
  gen_std

  pushd ./tag-asterinas/ostd/
  cargo clean
  UPG_DIR=$UPG_DIR/asterinas CARGO_BUILD_ARGS="--target x86_64-unknown-none" upg
  popd

  # Prune logs.
  rm target/upg/**/upg.log
  rm target/upg/**/rustflags.json

  cp target/upg/asterinas/alloc data -r
  cp target/upg/asterinas/core data -r
  cp target/upg/asterinas/ostd data -r
  cp target/upg/demo/std data -r
}

gen_data
