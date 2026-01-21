#![feature(rustc_private)]

extern crate itertools;
extern crate rustc_abi;
extern crate rustc_data_structures;
extern crate rustc_driver;
extern crate rustc_hir;
extern crate rustc_interface;
extern crate rustc_middle;
extern crate rustc_public;
extern crate rustc_public_bridge;
extern crate rustc_span;

use rustc_middle::ty::TyCtxt;
use rustc_public::CrateDef;
use std::ops::ControlFlow;

mod adt;
mod analyze_fn_def;
mod info_adt;
mod info_fn;
mod info_mod;
mod output;

mod utils;
pub use utils::{FxIndexMap, FxIndexSet, ThinVec};

fn main() {
    let rustc_args: Vec<_> = std::env::args().collect();
    _ = rustc_public::run_with_tcx!(&rustc_args, run);
}

fn run(tcx: TyCtxt) -> ControlFlow<(), ()> {
    let local_crate = rustc_public::local_crate();
    let fn_defs = local_crate.fn_defs();

    let navi = info_mod::navi(tcx);

    let mut cache_adt = Default::default();
    let writer = output::Writer::new(&local_crate.name);
    let mut map_fn = FxIndexMap::with_capacity_and_hasher(fn_defs.len(), Default::default());

    let mut out_funcs = Vec::with_capacity(fn_defs.len());
    let mut out_adts = Vec::with_capacity(fn_defs.len());

    for fn_def in fn_defs {
        if let Some(body) = fn_def.body() {
            let v_sp = get_tags(fn_def);

            let collector = analyze_fn_def::collect(&body);
            let finfo = info_fn::FnInfo::new(collector, &body, v_sp.into(), &mut cache_adt);

            let finfo = &*map_fn.entry(fn_def).or_insert(finfo);

            let out_func = output::caller::Caller::new(fn_def, finfo, tcx, &navi);
            out_funcs.push(out_func);
        }
    }

    let map_adt = info_adt::adt_info(&map_fn);
    for (adt, adt_info) in &map_adt {
        let out_adt = output::adt::Adt::new(adt, adt_info, tcx);
        out_adts.push(out_adt);
    }
    let adt_fn_collecor = info_adt::AdtFnCollector::new(&map_adt, &map_fn);

    for out_func in &mut out_funcs {
        out_func.update_adt_fn(&adt_fn_collecor);
        out_func.dump(&writer);
    }
    for out_adt in &mut out_adts {
        out_adt.dump(&writer);
    }
    writer.dump_json("navi", "tree", &navi);

    if std::env::var("UPG_CONTINUE").ok().is_some_and(|s| s != "0") {
        // Emit artifacts: this is necessary for crates that has dependencies.
        ControlFlow::Continue(())
    } else {
        ControlFlow::Break(())
    }
}

fn get_tags(fn_def: rustc_public::ty::FnDef) -> Vec<safety_parser::safety::PropertiesAndReason> {
    fn_def
        .all_tool_attrs()
        .iter()
        .flat_map(|attr| safety_parser::safety::parse_attr_and_get_properties(attr.as_str()))
        .collect()
}
