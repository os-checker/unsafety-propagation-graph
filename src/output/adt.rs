use super::{Writer, utils};
use crate::{
    FxIndexMap,
    adt::Adt as RawAdt,
    info_adt::{Access as RawAccess, AdtInfo},
    output::utils::doc_internal,
};
use rustc_middle::ty::TyCtxt;
use rustc_public::{rustc_internal::internal, ty::FnDef};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Adt {
    pub name: String,
    pub constructors: Vec<String>,
    pub access_self_as_arg: Access,
    pub access_self_as_locals: Access,
    pub access_field: Vec<Access>,
    pub span: String,
    pub src: String,
    pub kind: String,
    pub doc_adt: String,
    pub variant_fields: FxIndexMap<String, VariantField>,
}

impl Adt {
    pub fn new(adt: &RawAdt, info: &AdtInfo, tcx: TyCtxt) -> Adt {
        let kind = format!("{:?}", adt.def.kind());

        let mut variant_fields =
            FxIndexMap::with_capacity_and_hasher(adt.variant_fields.len(), Default::default());
        let adt_def = internal(tcx, adt.def);
        for vf in &*adt.variant_fields {
            let idx = format!("{:?}", vf.idx);
            let name = vf.name.to_string();
            let old = match (vf.idx.field, vf.idx.variant) {
                // unit struct: no fields
                (None, None) => break,
                // enum variant probably without fields
                (None, Some(variant_idx)) => {
                    let did = adt_def.variant(variant_idx.into()).def_id;
                    let doc = utils::doc_internal(did, tcx);
                    variant_fields.insert(idx, VariantField { name, doc })
                }
                (Some(field_idx), None) => {
                    let variant = adt_def.variant(0u32.into());
                    let field = variant
                        .fields
                        .get(rustc_abi::FieldIdx::from_u32(field_idx))
                        .unwrap();
                    let doc = doc_internal(field.did, tcx);
                    variant_fields.insert(idx, VariantField { name, doc })
                }
                (Some(_), Some(_)) => {
                    let doc = String::new();
                    variant_fields.insert(idx, VariantField { name, doc })
                }
            };
            assert!(old.is_none(), "{adt_def:?}: {vf:?} has been inserted")
        }

        Adt {
            name: utils::name(adt.def, tcx),
            constructors: v_fn_name(&info.constructors, tcx),
            access_self_as_arg: Access::new(&info.as_argument, tcx),
            access_self_as_locals: Access::new(&info.otherwise, tcx),
            access_field: info.fields.iter().map(|f| Access::new(f, tcx)).collect(),
            span: utils::span(adt.def, tcx),
            src: utils::src(adt.def, tcx),
            kind,
            doc_adt: utils::doc(adt.def, tcx),
            variant_fields,
        }
    }

    pub fn dump(&self, writer: &Writer) {
        writer.dump_json("adt", &self.name, self);
    }
}

#[derive(Debug, Serialize)]
pub struct Access {
    pub read: Vec<String>,
    pub write: Vec<String>,
    pub other: Vec<String>,
}

impl Access {
    fn new(raw: &RawAccess, tcx: TyCtxt) -> Access {
        Access {
            read: v_fn_name(&raw.read, tcx),
            write: v_fn_name(&raw.write, tcx),
            other: v_fn_name(&raw.other, tcx),
        }
    }
}

fn v_fn_name(v: &[FnDef], tcx: TyCtxt) -> Vec<String> {
    let mut v: Vec<_> = v.iter().map(|c| utils::name(*c, tcx)).collect();
    v.sort_unstable();
    v
}

#[derive(Debug, Serialize)]
pub struct VariantField {
    pub name: String,
    pub doc: String,
}
