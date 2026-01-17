#!/bin/bash

set -eoux pipefail

cargo install --path . --locked --debug

export UPG_DIR=$PWD/target/upg
rm "$UPG_DIR" -rf
mkdir "$UPG_DIR"

export RUST_LOG=debug
export UPG_RUST_STD_LIBRARY=$(rustc --print=sysroot)/lib/rustlib/src/rust/library

export RAPX_STD_JSON=$PWD/assets/std.json
export RAPX_STD_MAPPING_DIR=$PWD/assets/fn_name_mapping
export RAPX_STD_SPEC=$PWD/assets/specs/sp-core.toml
export RAPX_STD_OUT=$PWD/data/tags/std.json

pushd tests/demo
cargo clean

# UPG_DRIVER=upg-rapx-adpator upg
# cp "$UPG_DIR"/_rapx/core.json assets/fn_name_mapping/
# cp "$UPG_DIR"/_rapx/std.json assets/fn_name_mapping/
# cp "$UPG_DIR"/_rapx/alloc.json assets/fn_name_mapping/

export LD_LIBRARY_PATH=$(rustc --print sysroot)/lib
UPG_RAPX_CONVERT=1 SP_FILE="$RAPX_STD_SPEC" upg-rapx-adpator
