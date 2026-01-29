use rustc_hir::def_id::DefId as IDefId;
use rustc_middle::ty::TyCtxt;
use rustc_public::{
    CrateDef,
    mir::Safety,
    rustc_internal::internal,
    ty::{FnDef, Span},
};
use serde::Serialize;

use crate::info_mod::crate_name;

#[derive(Debug, Serialize)]
pub struct Meta {
    pub name: String,
    pub span: String,
}

impl Meta {
    pub fn new<T: CrateDef + Copy>(item: T, tcx: TyCtxt) -> Self {
        Meta {
            name: name(item, tcx),
            span: span(item, tcx),
        }
    }
}

pub fn name<T: CrateDef + Copy>(item: T, tcx: TyCtxt) -> String {
    let mut name = item.name();
    if did(item, tcx).is_local() {
        // FIXME: in future toolchain versions, we don't need adding
        // crate name anymore, because rustc_public's .name() handles it.
        // https://github.com/rust-lang/project-stable-mir/issues/109
        name = format!("{}::{name}", crate_name(tcx).as_str());
    }
    name
}

pub fn span<T: CrateDef>(item: T, tcx: TyCtxt) -> String {
    let span = internal(tcx, item.span());
    let src_map = tcx.sess.source_map();
    // --remap-path-prefix
    src_map.span_to_string(span, rustc_span::FileNameDisplayPreference::Remapped)
}

pub fn src<T: CrateDef>(item: T, tcx: TyCtxt) -> String {
    src_from_span(item.span(), tcx)
}

pub fn src_from_span(span: Span, tcx: TyCtxt) -> String {
    let span = internal(tcx, span);
    let src_map = tcx.sess.source_map();
    src_map.span_to_snippet(span).unwrap_or_default()
}

pub fn did<T: CrateDef>(item: T, tcx: TyCtxt) -> IDefId {
    internal(tcx, item.def_id())
}

pub fn doc<T: CrateDef>(item: T, tcx: TyCtxt) -> String {
    doc_internal(did(item, tcx), tcx)
}

pub fn doc_internal(did: IDefId, tcx: TyCtxt) -> String {
    use rustc_hir::Attribute;
    use rustc_hir::attrs::AttributeKind;
    use std::fmt::Write;

    let mut buf = String::new();
    for attr in tcx.get_all_attrs(did) {
        if let Attribute::Parsed(AttributeKind::DocComment { comment, .. }) = attr {
            _ = writeln!(&mut buf, "{comment}");
        }
    }
    buf
}

/// If the function is unsafe.
pub fn is_safe(fn_def: FnDef) -> bool {
    matches!(fn_def.fn_sig().value.safety, Safety::Safe)
}
