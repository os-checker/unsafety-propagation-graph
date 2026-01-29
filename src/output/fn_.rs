use super::{
    Writer,
    utils::{self, Meta},
};
use crate::{FxIndexMap, FxIndexSet, info_fn::FnInfo};
use rustc_middle::ty::TyCtxt;
use rustc_public::{mir::Body, ty::FnDef};
use serde::Serialize;

pub fn dump(map_fn: &FxIndexMap<FnDef, FnInfo>, tcx: TyCtxt, writer: &Writer) {
    let mut unsafe_fns = FxIndexMap::<String, Unsafe>::with_capacity_and_hasher(
        map_fn.len() / 4,
        Default::default(),
    );
    let mut all_fns =
        FxIndexSet::<FnDef>::with_capacity_and_hasher(map_fn.len() * 2, Default::default());

    for (&caller, info) in map_fn {
        // Collect all functions from caller and direct callees.
        all_fns.insert(caller);
        for &fn_def in info.callees.keys() {
            all_fns.insert(fn_def);
        }

        // Collect all unsafe fns, including
        // * unsafe caller
        // * or safe fn with unsafe callees
        let unsafe_caller = !utils::is_safe(caller);
        let unsafe_callee = info.callees.keys().any(|&f| !utils::is_safe(f));
        if unsafe_caller | unsafe_callee {
            let fn_name = utils::name(caller, tcx);
            let kind = match (unsafe_caller, unsafe_callee) {
                (true, true) => Unsafe::Both,
                (true, false) => Unsafe::Caller,
                (false, true) => Unsafe::Callee,
                (false, false) => unreachable!(),
            };
            unsafe_fns.insert(fn_name, kind);
        }
    }

    // Sort unsafe fns.
    unsafe_fns.sort_unstable_keys();
    writer.dump_json("navi", "unsafe_fns", &unsafe_fns);

    for fn_def in all_fns {
        let doc = Documentation::new(fn_def, tcx);

        let name = &doc.meta.name;
        writer.dump_json(name, "doc", &doc);

        if utils::did(fn_def, tcx).is_local()
            && let Some(body) = fn_def.body()
        {
            let mir = Mir::new(fn_def, &body, tcx);
            writer.dump_json(name, "mir", &mir);

            let src = Source::new_with_body(fn_def, &body, tcx);
            writer.dump_json(name, "src", &src);
        } else {
            let src = Source::new(fn_def, tcx);
            writer.dump_json(name, "src", &src);
        }
    }
}

#[derive(Debug, Serialize)]
pub enum Unsafe {
    /// The function is unsafe, but no unsafe callees inside.
    Caller,
    /// At least one unsafe callee is called.
    Callee,
    /// The function is unsafe, and calles unsafe functions inside.
    Both,
}

#[derive(Debug, Serialize)]
pub struct Source {
    #[serde(flatten)]
    pub meta: Meta,
    pub src: String,
}

impl Source {
    pub fn new_with_body(fn_def: FnDef, body: &Body, tcx: TyCtxt) -> Self {
        Self {
            meta: Meta::new(fn_def, tcx),
            src: utils::src_from_span(body.span, tcx),
        }
    }

    pub fn new(fn_def: FnDef, tcx: TyCtxt) -> Self {
        Self {
            meta: Meta::new(fn_def, tcx),
            src: utils::src(fn_def, tcx),
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
