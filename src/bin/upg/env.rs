use crate::Result;
use std::{env::var, path::PathBuf, sync::LazyLock};
use tracing_subscriber::{EnvFilter, fmt, prelude::*};

#[allow(non_snake_case)]
pub struct EnvVar {
    /// `unsafety-propagation-graph` CLI.
    pub UPG_DRIVER: String,
    /// `upg` CLI.
    pub UPG_BIN: String,
    /// Path to verify-rust-std/library
    pub UPG_RUST_STD_LIBRARY: Option<PathBuf>,
    /// The env var `UPG_DIR` as the output directory.
    pub UPG_DIR: PathBuf,
    /// RUSTCFLAGS
    pub CARGO_ENCODED_RUSTFLAGS: String,
}

impl EnvVar {
    pub fn write_rustflags_json(&self, json: &serde_json::Value) -> Result<()> {
        const JSON_FILE: &str = "rustflags.json";

        let path = self.UPG_DIR.join(JSON_FILE);
        let writer = std::fs::File::create(&path)?;
        serde_json::to_writer_pretty(writer, json)?;
        let path = path.canonicalize()?;
        info!("{path:?} is written.");
        Ok(())
    }
}

// #[allow(non_snake_case)]
// fn UPG_RUST_STD_LIBRARY() -> PathBuf {
//     if let Ok(s) = var("UPG_RUST_STD_LIBRARY") {
//         PathBuf::from(s)
//     } else {
//         let output = Command::new("rustc")
//             .arg("--print=sysroot")
//             .output()
//             .unwrap()
//             .stdout;
//         let sysroot = std::str::from_utf8(&output).unwrap().trim();
//         let mut path = PathBuf::from(sysroot);
//         path.extend(["lib", "rustlib", "src", "rust", "library"]);
//         path
//     }
//     .canonicalize()
//     .unwrap()
// }

#[allow(non_snake_case)]
fn UPG_DIR() -> PathBuf {
    let dir = var("UPG_DIR").expect("`UPG_DIR` must be set to a path");
    let dir = PathBuf::from(dir).canonicalize().unwrap();

    let log_file = std::fs::OpenOptions::new()
        .append(true)
        .create(true)
        .open(dir.join("upg.log"))
        .unwrap();

    tracing_subscriber::registry()
        .with(fmt::layer().with_writer(log_file))
        .with(EnvFilter::from_default_env())
        .init();

    dir
}

fn var_or_string(env: &str, default: &str) -> String {
    var(env).unwrap_or_else(|_| default.to_owned())
}

pub static ENV: LazyLock<EnvVar> = LazyLock::new(|| EnvVar {
    UPG_DRIVER: var_or_string("UPG_DRIVER", "unsafety-propagation-graph"),
    UPG_BIN: var_or_string("UPG_BIN", "upg"),
    UPG_RUST_STD_LIBRARY: var("UPG_RUST_STD_LIBRARY")
        .ok()
        .and_then(|s| PathBuf::from(s).canonicalize().ok()),
    UPG_DIR: UPG_DIR(),
    CARGO_ENCODED_RUSTFLAGS: rustc_flags().join("\u{1f}"),
});

const WRAPPER: &str = "WRAPPER";
/// Inner env var to know if the process is cargo wrapper (verify_rust_std).
pub fn is_wrapper() -> bool {
    var(WRAPPER).as_deref() == Ok("1")
}
/// Set inner env var when cargo wrapper is to run.
pub fn set_wrapper() -> (&'static str, &'static str) {
    (WRAPPER, "1")
}

pub fn set_rustc_wrapper() -> (&'static str, &'static str) {
    ("RUSTC", &ENV.UPG_BIN)
}

const UPG_ARGS: &[&str] = &[
    "-Cpanic=abort",
    "-Csymbol-mangling-version=v0",
    "-Zunstable-options",
    "-Ztrim-diagnostic-paths=no",
    "-Zhuman_readable_cgu_names",
    "-Zalways-encode-mir",
    "-Zcrate-attr=feature(register_tool)",
    "-Zcrate-attr=register_tool(rapx)",
    "-Zmir-enable-passes=-RemoveStorageMarkers",
];

fn rustc_flags() -> Vec<String> {
    UPG_ARGS.iter().map(|arg| arg.to_string()).collect()
}
