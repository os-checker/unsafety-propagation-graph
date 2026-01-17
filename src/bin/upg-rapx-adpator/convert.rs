use serde::Deserialize;
use std::{collections::HashMap, env, fs};

pub fn run() {
    let file = env::var("RAPX_STD_JSON").unwrap();
    let file = fs::File::open(&file).unwrap();
    let std_json: HashMap<String, Data> = serde_json::from_reader(file).unwrap();
    dbg!(std_json.len());
}

// "core::alloc::global::GlobalAlloc::alloc": { "0": [ "ValidNum", "Init" ] },
#[derive(Debug, Deserialize)]
struct Data {
    #[serde(rename = "0")]
    tags: Vec<String>,
}
