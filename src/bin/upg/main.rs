//! This is a cargo wrapper to the rustc driver `unsafety-propagation-graph`.

use eyre::{Context, Result};
use std::process::{Command, Stdio};

#[macro_use]
extern crate tracing;

#[macro_use]
extern crate eyre;

mod env;
use env::ENV;

fn main() -> Result<()> {
    // arguments passed to rustc
    let args = std::env::args().skip(1).collect::<Vec<_>>();

    if args.as_slice() == ["-vv"] {
        // cargo invokes `rustc -vV` first
        run("rustc", &["-vV".to_owned()], &[])
    } else if env::is_wrapper() {
        // then cargo invokes `rustc - --crate-name ___ --print=file-names`
        // if args[0] == "-" {
        // `rustc -` is a substitute file name from stdin
        // see https://rust-lang.zulipchat.com/#narrow/channel/182449-t-compiler.2Fhelp/topic/.E2.9C.94.20What.20does.20.60rustc.20-.60do.3F/with/514494493
        //     args[0] = "src/main.rs".to_owned();
        // }

        if args.iter().any(|arg| is_normal_built(arg)) {
            // build non-core crates
            run("rustc", &args, &[])
        } else {
            let json = serde_json::json!({
                "rustc": format!("rustc {}", args.join(" "))
            });
            ENV.write_rustflags_json(&json)?;
            build_core(args)
        }
    } else {
        run_cargo()
    }
}

fn run_cargo() -> std::result::Result<(), eyre::Error> {
    let build_std: Vec<_> = if ENV.UPG_RUST_STD_LIBRARY.is_some() {
        ["build", "-Zbuild-std=core,alloc"]
            .iter()
            .map(|s| s.to_string())
            .collect()
    } else {
        ["build"].iter().map(|s| s.to_string()).collect()
    };
    run(
        "cargo",
        &build_std,
        &[
            env::set_rustc_wrapper(),
            env::set_wrapper(),
            env::set_upg_continue(),
        ],
    )
}

fn run(cmd: &str, args: &[String], vars: &[(&str, &str)]) -> Result<()> {
    let mut command = Command::new(cmd);
    let rustflags = &*ENV.CARGO_ENCODED_RUSTFLAGS;

    debug!(cmd, ?args, ?vars,);
    let _span = if let Some(library) = ENV.UPG_RUST_STD_LIBRARY.as_deref() {
        // Build std if the library path is set.
        command.env("__CARGO_TESTS_ONLY_SRC_ROOT", library);
        debug_span!("run", cmd, ?library, ?args, ?vars,).entered()
    } else {
        debug_span!("run", cmd, ?args, ?vars,).entered()
    };

    let status = command
        .args(args)
        .env("CARGO_ENCODED_RUSTFLAGS", rustflags)
        .envs(vars.iter().copied())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .with_context(|| "Failed to spawn a cmd process")?
        .wait()
        .with_context(|| "Failed to wait a cmd process")?;

    ensure!(status.success(), "Process aborts.");

    Ok(())
}

fn build_core(args: Vec<String>) -> Result<()> {
    run(&ENV.UPG_DRIVER, &args, &[])
}

/// Normally build crates such as proc-macros, build scripts, and some common used crates we don't
/// care from verify-rust-std. This can be possible false positive, but it works currently.
fn is_normal_built(arg: &str) -> bool {
    matches!(
        arg,
        "proc-macro"
            | "build_script_build"
            | "syn"
            | "quote"
            | "proc_macro2"
            | "unicode_ident"
            | "version_check"
            | "proc_macro_error"
            | "proc_macro_error_attr"
            | "compiler_builtins"
    )
}
