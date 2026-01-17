use crate::FunctionName;
use indexmap::IndexMap;
use serde::Deserialize;
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
    let mut output = IndexMap::<String, Vec<String>>::with_capacity(std_json.len());
    for (raw_fn_name, data) in &std_json {
        // Check all fn names are present.
        let Some(v_fn_name) = mapping.get(raw_fn_name) else {
            panic!("{raw_fn_name} is not in mapping")
        };
        if !data.tags.is_empty() {
            for fn_name in v_fn_name {
                output.insert(fn_name.def_path.clone(), data.tags.clone());
            }
        }
    }
    output.sort_unstable_keys();
    dbg!(output.len());

    // Write converted std.json
    let out_file = env::var("RAPX_STD_OUT").unwrap();
    let out_file = fs::File::create(out_file).unwrap();
    serde_json::to_writer_pretty(out_file, &output).unwrap();

    let spec = &safety_parser::configuration::CACHE.map;
    dbg!(spec.len());
    assert!(!spec.is_empty());

    let mut missing = HashSet::<&str>::with_capacity(spec.len());
    for tags in output.values() {
        for tag_name in tags {
            let tag_name = tag_name.as_str();
            if !spec.contains_key(tag_name) {
                missing.insert(tag_name);
            }
        }
    }
    if !missing.is_empty() {
        eprintln!("{} tags have no spec: {missing:#?}", missing.len());
    }
}

// "core::alloc::global::GlobalAlloc::alloc": { "0": [ "ValidNum", "Init" ] },
#[derive(Debug, Deserialize)]
struct InputData {
    #[serde(rename = "0")]
    tags: Vec<String>,
}
