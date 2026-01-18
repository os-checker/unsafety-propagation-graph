use crate::FunctionName;
use indexmap::IndexMap;
use safety_parser::{configuration, safety::PropertiesAndReason};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    env, fs,
};

pub fn run() {
    // Read std.json
    let file = env::var("RAPX_STD_JSON").unwrap();
    let file = fs::File::open(file).unwrap();
    let std_json: HashMap<String, InputData> = serde_json::from_reader(file).unwrap();
    dbg!(std_json.len());

    // Read mapping JSONs.
    let dir = env::var("RAPX_STD_MAPPING_DIR").unwrap();
    let mut mapping_json = Vec::<FunctionName>::with_capacity(1024);
    for entry in fs::read_dir(dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let json = fs::File::open(path).unwrap();
            let json: Vec<FunctionName> = serde_json::from_reader(json).unwrap();
            mapping_json.extend(json);
        }
    }
    let len = dbg!(mapping_json.len());

    // Merge mapping JSONs by rapx key.
    let mut mapping = HashMap::<String, Vec<FunctionName>>::with_capacity(len);
    for item in mapping_json {
        if let Some(v) = mapping.get_mut(&item.rapx) {
            v.push(item);
        } else {
            mapping.insert(item.rapx.clone(), vec![item]);
        }
    }
    dbg!(mapping.len());

    // The key is upg fn name, value is vec of tag names.
    let mut v_fn = IndexMap::<String, Vec<PropertiesAndReason>>::with_capacity(std_json.len());
    for (raw_fn_name, data) in &std_json {
        // Check all fn names are present.
        let Some(v_fn_name) = mapping.get(raw_fn_name) else {
            panic!("{raw_fn_name} is not in mapping")
        };
        if !data.tags.is_empty() {
            for fn_name in v_fn_name {
                let v_sp = data
                    .tags
                    .iter()
                    .map(|s| {
                        PropertiesAndReason::parse_sp_str(s)
                            .unwrap_or_else(|err| panic!("{s} is not a valid property: {err:?}"))
                    })
                    .collect();
                v_fn.insert(fn_name.def_path.clone(), v_sp);
            }
        }
    }
    v_fn.sort_unstable_keys();
    dbg!(v_fn.len());

    let spec = &configuration::CACHE.map;
    dbg!(spec.len());
    assert!(!spec.is_empty());

    // Check tag that is not specified.
    let mut missing = HashSet::<String>::with_capacity(spec.len());
    for tags in v_fn.values() {
        for tag in tags.iter().flat_map(|t| t.tags.iter()) {
            if let Some(any_args) = tag.args_in_any_tag() {
                for arg in any_args {
                    for tag in arg.tags {
                        let name = tag.tag.name();
                        if !spec.contains_key(name) {
                            missing.insert(name.to_owned());
                        }
                    }
                }
            } else {
                let name = tag.tag.name();
                if !spec.contains_key(name) {
                    missing.insert(name.to_owned());
                }
            }
        }
    }
    if !missing.is_empty() {
        panic!("{} tags have no spec: {missing:#?}", missing.len());
    }

    // Write converted std.json
    let out_file = env::var("RAPX_STD_OUT").unwrap();
    let out_file = fs::File::create(out_file).unwrap();
    // Clean src because it's unnecessary for WebUI and reduces space.
    let mut spec = spec.clone();
    spec.values_mut().for_each(|v| v.src = Box::default());
    serde_json::to_writer_pretty(out_file, &Ouput { v_fn, spec }).unwrap();
}

// "core::alloc::global::GlobalAlloc::alloc": { "0": [ "ValidNum", "Init" ] },
#[derive(Debug, Deserialize)]
struct InputData {
    #[serde(rename = "0")]
    tags: Vec<String>,
}

#[derive(Serialize)]
struct Ouput {
    v_fn: IndexMap<String, Vec<PropertiesAndReason>>,
    spec: IndexMap<Box<str>, configuration::Key>,
}
