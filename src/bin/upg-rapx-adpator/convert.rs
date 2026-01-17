use crate::FunctionName;
use serde::Deserialize;
use std::{collections::HashMap, env, fs};

pub fn run() {
    let file = env::var("RAPX_STD_JSON").unwrap();
    let file = fs::File::open(file).unwrap();
    let std_json: HashMap<String, Data> = serde_json::from_reader(file).unwrap();
    dbg!(std_json.len());

    let dir = env::var("RAPX_STD_MAPPING_DIR").unwrap();
    let mut mapping = Vec::<FunctionName>::with_capacity(1024);
    for entry in fs::read_dir(dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let mapping_json = fs::File::open(path).unwrap();
            let mapping_json: Vec<FunctionName> = serde_json::from_reader(mapping_json).unwrap();
            mapping.extend(mapping_json);
        }
    }
    dbg!(mapping.len());
}

// "core::alloc::global::GlobalAlloc::alloc": { "0": [ "ValidNum", "Init" ] },
#[derive(Debug, Deserialize)]
struct Data {
    #[serde(rename = "0")]
    tags: Vec<String>,
}
