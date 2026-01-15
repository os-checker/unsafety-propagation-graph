#!/bin/bash

set -eoux pipefail

cargo install --path . --locked --debug

export UPG_DIR=$PWD/target/upg
rm "$UPG_DIR" -rf
mkdir "$UPG_DIR"

pushd tests/demo
upg
