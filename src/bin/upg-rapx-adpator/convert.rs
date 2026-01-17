use crate::FunctionName;
use serde::Deserialize;
use std::{collections::HashMap, env, fs};

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

    for (raw_fn_name, tags) in &std_json {
        if !mapping.contains_key(raw_fn_name) {
            eprintln!("{raw_fn_name} is not in mapping");
        }
    }
}

// "core::alloc::global::GlobalAlloc::alloc": { "0": [ "ValidNum", "Init" ] },
#[derive(Debug, Deserialize)]
struct InputData {
    #[serde(rename = "0")]
    tags: Vec<String>,
}
