use super::{Writer, utils};
use crate::{
    info_adt::{AdtFnCollector, OutAdtFnKindInfo, out_adt_fn_kind_info},
    info_fn::FnInfo,
    info_mod::Navigation,
    utils::FxIndexMap,
};
use rustc_middle::ty::TyCtxt;
use rustc_public::{CrateDef, DefId, mir::Safety, rustc_internal::internal, ty::FnDef};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Caller {
    #[serde(skip)]
    pub fn_def: FnDef,
    #[serde(flatten)]
    pub meta: utils::Meta,
    pub safe: bool,
    /// Direct callees. The key is generic FnDef name, the value is Instance info.
    pub callees: FxIndexMap<String, CalleeInfo>,
    pub adts: FxIndexMap<String, Vec<String>>,
    pub path: OutputPath,
}

impl Caller {
    pub fn new(fn_def: FnDef, info: &FnInfo, tcx: TyCtxt, navi: &Navigation) -> Self {
        Caller {
            fn_def,
            meta: utils::Meta::new(fn_def, tcx),
            safe: is_safe(fn_def),
            callees: output_callee(info),
            adts: info
                .adts
                .iter()
                .map(|(adt, locals)| {
                    (
                        adt.as_string(),
                        locals.access.iter().map(|acc| format!("{acc:?}")).collect(),
                    )
                })
                .collect(),
            path: def_path(fn_def.def_id(), tcx, navi),
        }
    }

    pub fn update_adt_fn(&mut self, adt_fn_collecor: &AdtFnCollector) {
        for (callee, info) in &mut self.callees {
            if let Some(map) = adt_fn_collecor.caller_callee_map.get(&self.fn_def)
                && let Some(adt_map) = map.get(callee.as_str())
            {
                info.adt = adt_map
                    .iter()
                    .map(|(adt, fn_kind)| (adt.name(), out_adt_fn_kind_info(fn_kind)))
                    .collect();
            }
        }
    }

    pub fn dump(&self, writer: &Writer) {
        writer.dump_json(&self.meta.name, "caller", self);
    }
}

}

#[derive(Debug, Serialize)]
#[serde(tag = "type", content = "path")]
pub enum OutputPath {
    Local(Box<str>),
    External(Box<str>),
}

fn def_path(def_id: DefId, tcx: TyCtxt, navi: &Navigation) -> OutputPath {
    let did = internal(tcx, def_id);
    let def_path_str = tcx.def_path_str(did);
    let def_path_str_maybe_local = format!("{}::{def_path_str}", navi.crate_root());
    match navi.name_to_id(&def_path_str_maybe_local) {
        Some(_) => OutputPath::Local(def_path_str_maybe_local.into()),
        None => OutputPath::External(def_path_str.into()),
    }
}

#[derive(Debug, Serialize)]
pub struct CalleeInfo {
    pub safe: bool,
    pub adt: FxIndexMap<String, OutAdtFnKindInfo>,
}

pub fn output_callee(finfo: &FnInfo) -> FxIndexMap<String, CalleeInfo> {
    let mut map = FxIndexMap::<String, CalleeInfo>::default();
    for (fn_def, info) in &finfo.callees {
        let fn_def = *fn_def;
        let callee_info = CalleeInfo {
            safe: is_safe(fn_def),
            adt: Default::default(),
        };
        map.insert(info.non_instance_name.clone(), callee_info);
    }
    map
}

fn is_safe(fn_def: FnDef) -> bool {
    matches!(fn_def.fn_sig().value.safety, Safety::Safe)
}
