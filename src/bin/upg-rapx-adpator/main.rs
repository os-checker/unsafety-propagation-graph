//! This CLI converts RAPx function name to upg function names for std.json.

#![feature(trim_prefix_suffix)]
#![feature(rustc_private)]

extern crate indexmap;
extern crate rustc_driver;
extern crate rustc_hir;
extern crate rustc_interface;
extern crate rustc_middle;
extern crate rustc_public;

mod convert;

use rustc_hir::def_id::DefId;
use rustc_middle::ty::TyCtxt;
use rustc_public::{CrateDef, rustc_internal};
use serde::{Deserialize, Serialize};
use std::{env, fs, ops::ControlFlow, path::PathBuf};

fn main() {
    if env::var("UPG_RAPX_CONVERT").is_ok_and(|s| s != "0") {
        convert::run();
    } else {
        // As a rustc driver.
        let rustc_args: Vec<_> = env::args().collect();
        _ = rustc_public::run_with_tcx!(&rustc_args, run);
    }
}

fn run(tcx: TyCtxt) -> ControlFlow<(), ()> {
    // Make sure UPG_DIR is created before this.
    let dir = env::var("UPG_DIR").unwrap();
    let dir = PathBuf::from(dir).canonicalize().unwrap();

    let local_crate = rustc_public::local_crate();
    let crate_name = local_crate.name.as_str();

    let fn_defs = local_crate.fn_defs();
    let mut v_fn_name = Vec::with_capacity(fn_defs.len());
    for fn_def in fn_defs {
        let did = rustc_internal::internal(tcx, fn_def.def_id());
        let rapx = get_cleaned_def_path_name(tcx, did);
        let def_path = tcx.def_path_str(did);
        let fn_name = FunctionName {
            rapx,
            def_id: format!("{did:?}"),
            // Fill the root.
            def_path: format!("{crate_name}::{def_path}"),
        };
        v_fn_name.push(fn_name);
    }

    // Write JSON to `$UPG_DIR/_rapx/$crate_name`.
    let dir_rapx = dir.join("_rapx");
    _ = fs::create_dir(&dir_rapx);
    let mut file_name = dir_rapx.join(crate_name);
    file_name.set_extension("json");
    let file = fs::File::create(file_name).unwrap();
    serde_json::to_writer_pretty(file, &v_fn_name).unwrap();

    if env::var("UPG_CONTINUE").is_ok_and(|s| s != "0") {
        ControlFlow::Continue(())
    } else {
        ControlFlow::Break(())
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct FunctionName {
    rapx: String,
    def_id: String,
    def_path: String,
}

pub fn get_cleaned_def_path_name(tcx: TyCtxt<'_>, def_id: DefId) -> String {
    let def_id_str = format!("{:?}", def_id);
    let mut parts: Vec<&str> = def_id_str.split("::").collect();

    let mut remove_first = false;
    if let Some(first_part) = parts.get_mut(0) {
        if first_part.contains("core") {
            *first_part = "core";
        } else if first_part.contains("std") {
            *first_part = "std";
        } else if first_part.contains("alloc") {
            *first_part = "alloc";
        } else {
            remove_first = true;
        }
    }
    if remove_first && !parts.is_empty() {
        parts.remove(0);
    }

    let new_parts: Vec<String> = parts
        .into_iter()
        .filter_map(|s| {
            if s.contains("{") {
                if remove_first {
                    get_struct_name(tcx, def_id)
                } else {
                    None
                }
            } else {
                Some(s.to_string())
            }
        })
        .collect();

    let mut cleaned_path = new_parts.join("::");
    cleaned_path = cleaned_path.trim_end_matches(')').to_string();
    cleaned_path
    // tcx.def_path_str(def_id)
    //     .replace("::", "_")
    //     .replace("<", "_")
    //     .replace(">", "_")
    //     .replace(",", "_")
    //     .replace(" ", "")
    //     .replace("__", "_")
}
pub fn get_struct_name(tcx: TyCtxt<'_>, def_id: DefId) -> Option<String> {
    if let Some(assoc_item) = tcx.opt_associated_item(def_id)
        && let Some(impl_id) = assoc_item.impl_container(tcx)
    {
        let ty = tcx.type_of(impl_id).skip_binder();
        let type_name = ty.to_string();
        let struct_name = type_name
            .split('<')
            .next()
            .unwrap_or("")
            .split("::")
            .last()
            .unwrap_or("")
            .to_string();

        return Some(struct_name);
    }
    None
}
