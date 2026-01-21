use rustc_hir::def_id::DefId as IDefId;
use rustc_middle::ty::TyCtxt;
use rustc_public::{CrateDef, rustc_internal::internal};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Meta {
    pub name: String,
    pub span: String,
}

impl Meta {
    pub fn new<T: CrateDef>(item: T) -> Self {
        Meta {
            name: item.name(),
            span: span(item),
        }
    }
}

pub fn span<T: CrateDef>(item: T) -> String {
    item.span().diagnostic()
}

pub fn src<T: CrateDef>(item: T, tcx: TyCtxt) -> String {
    let span = internal(tcx, item.span());
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
