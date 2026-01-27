use super::{
    Writer,
    utils::{self, Meta},
};
use crate::{FxIndexMap, FxIndexSet, info_fn::FnInfo};
use rustc_middle::ty::TyCtxt;
use rustc_public::{mir::Body, ty::FnDef};
use serde::Serialize;

pub fn dump(map_fn: &FxIndexMap<FnDef, FnInfo>, tcx: TyCtxt, writer: &Writer) {
    let mut all_fns =
        FxIndexSet::<FnDef>::with_capacity_and_hasher(map_fn.len() * 2, Default::default());
    // Collect all functions from caller and direct callees.
    for (caller, info) in map_fn {
        all_fns.insert(*caller);
        for &fn_def in info.callees.keys() {
            all_fns.insert(fn_def);
        }
    }

    for fn_def in all_fns {
        let doc = Documentation::new(fn_def, tcx);

        let name = &doc.meta.name;
        writer.dump_json(name, "doc", &doc);

        let src = Source::new(fn_def, tcx);
        writer.dump_json(name, "src", &src);

        if utils::did(fn_def, tcx).is_local()
            && let Some(body) = fn_def.body()
        {
            let mir = Mir::new(fn_def, &body, tcx);
            writer.dump_json(name, "mir", &mir);
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Source {
    #[serde(flatten)]
    pub meta: Meta,
    pub src: String,
}

impl Source {
    pub fn new(fn_def: FnDef, tcx: TyCtxt) -> Self {
        Self {
            meta: Meta::new(fn_def, tcx),
            src: utils::def_src(fn_def, tcx),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Mir {
    #[serde(flatten)]
    pub meta: Meta,
    pub mir: String,
}

impl Mir {
    pub fn new(fn_def: FnDef, body: &Body, tcx: TyCtxt) -> Self {
        let meta = Meta::new(fn_def, tcx);
        let mut buf = Vec::with_capacity(1024);
        _ = body.dump(&mut buf, &meta.name);
        let mir = String::from_utf8(buf).unwrap_or_default();
        Self { meta, mir }
    }
}

#[derive(Debug, Serialize)]
pub struct Documentation {
    #[serde(flatten)]
    pub meta: Meta,
    pub doc: String,
}

impl Documentation {
    pub fn new(fn_def: FnDef, tcx: TyCtxt) -> Self {
        Self {
            meta: Meta::new(fn_def, tcx),
            doc: utils::doc(fn_def, tcx),
        }
    }
}
