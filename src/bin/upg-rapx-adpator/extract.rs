use indexmap::IndexMap;
use rustc_middle::ty::TyCtxt;
use rustc_public::{CrateDef, rustc_internal::internal};
use safety_parser::safety::{PropertiesAndReason, parse_attr_and_get_properties};
use std::{env, fs, ops::ControlFlow, path::PathBuf};

pub fn run(tcx: TyCtxt) -> ControlFlow<(), ()> {
    // Make sure UPG_DIR is created before this.
    let dir = env::var("UPG_DIR").unwrap();
    let dir = PathBuf::from(dir).canonicalize().unwrap();

    let local_crate = rustc_public::local_crate();
    let crate_name = local_crate.name.as_str();

    let fn_defs = local_crate.fn_defs();
    let mut safety_tags =
        IndexMap::<String, Vec<PropertiesAndReason>>::with_capacity(fn_defs.len() / 3);

    for fn_def in fn_defs {
        let fn_name = tcx.def_path_str(internal(tcx, fn_def.def_id()));
        let mut tags = Vec::new();
        for attr in fn_def.all_tool_attrs() {
            // The attribute prettified like "#[rapx::requires(ValidPtr(v), InitializedInLen(l))]\n",
            // even though the source code is not formatted. So we can rely on the prefix.
            let attr = attr.as_str();
            if attr.starts_with("#[rapx::") {
                let v_sp = parse_attr_and_get_properties(attr);
                tags.extend(v_sp);
            }
        }
        if !tags.is_empty() {
            safety_tags.insert(fn_name, tags);
        }
    }

    let ret = crate::continue_or_break();
    if safety_tags.is_empty() {
        return ret;
    }

    // Write JSON to `$UPG_DIR/_tags/$crate_name`.
    let dir_rapx = dir.join("_tags");
    _ = fs::create_dir(&dir_rapx);
    let mut file_name = dir_rapx.join(crate_name);
    file_name.set_extension("json");
    let file = fs::File::create(file_name).unwrap();
    serde_json::to_writer_pretty(file, &safety_tags).unwrap();

    ret
}
