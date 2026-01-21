use crate::output::utils::{self, Meta};
use rustc_middle::ty::TyCtxt;
use rustc_public::{mir::Body, ty::FnDef};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Source {
    #[serde(flatten)]
    pub meta: Meta,
    pub src: String,
}

impl Source {
    pub fn new(fn_def: FnDef, tcx: TyCtxt) -> Self {
        Self {
            meta: Meta::new(fn_def),
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
    pub fn new(fn_def: FnDef, body: &Body) -> Self {
        let meta = Meta::new(fn_def);
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
            meta: Meta::new(fn_def),
            doc: utils::doc(fn_def, tcx),
        }
    }
}
