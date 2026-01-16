#!/bin/bash

set -eoux pipefail

cargo install --path . --locked --debug

export UPG_DIR=$PWD/target/upg
rm "$UPG_DIR" -rf
mkdir "$UPG_DIR"

export RUST_LOG=debug
export UPG_RUST_STD_LIBRARY=$(rustc --print=sysroot)/lib/rustlib/src/rust/library

pushd tests/demo
cargo clean
upg
