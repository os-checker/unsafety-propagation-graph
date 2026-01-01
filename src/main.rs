#![feature(rustc_private)]

extern crate rustc_data_structures;
extern crate rustc_driver;
extern crate rustc_interface;
extern crate rustc_middle;
extern crate rustc_public;

use rustc_data_structures::fx::FxIndexMap;
use rustc_middle::ty::TyCtxt;
use rustc_public::CrateDef;
use std::ops::ControlFlow;

mod analyze_fn_def;
mod info_adt;
mod info_fn;

fn main() {
    let rustc_args: Vec<_> = std::env::args().collect();
    _ = rustc_public::run_with_tcx!(&rustc_args, run);
}

fn run(tcx: TyCtxt) -> ControlFlow<(), ()> {
    use std::io::Write;
    let stdout = &mut std::io::stdout();

    let local_crate = rustc_public::local_crate();
    let fn_defs = local_crate.fn_defs();

    let mut map_fn = FxIndexMap::with_capacity_and_hasher(fn_defs.len(), Default::default());

    for fn_def in fn_defs {
        if let Some(body) = fn_def.body() {
            let name = fn_def.name();
            _ = writeln!(stdout, "\n{name}:");
            _ = body.dump(stdout, &name);
            let collector = analyze_fn_def::collect(&body);
            let finfo = info_fn::FnInfo::new(collector, &body);
            _ = writeln!(stdout, "{:#?}\n{:#?}", finfo.callees, &finfo.adts);
            map_fn.insert(fn_def, finfo);
        }
    }

    let map_adt = info_adt::adt_info(&map_fn);
    _ = writeln!(stdout, "{map_adt:#?}");

    ControlFlow::Break(())
}
