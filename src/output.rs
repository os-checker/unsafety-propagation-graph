use serde::Serialize;
use std::{fs, io, path::PathBuf};

pub mod adt;
pub mod caller;
pub mod fn_;
pub mod utils;

pub enum Writer {
    BaseDir(PathBuf),
    Stdout,
}

impl Writer {
    pub fn new(crate_name: &str) -> Self {
        match base_dir(crate_name) {
            Some(dir) => {
                match fs::create_dir_all(&dir) {
                    Ok(()) => (),
                    Err(err) if err.kind() == io::ErrorKind::AlreadyExists => (),
                    Err(err) => panic!("The directory {dir:?} is not created: {err}"),
                }
                Writer::BaseDir(dir)
            }
            None => Writer::Stdout,
        }
    }

    pub fn dump_json(&self, parent: &str, fname_stem: &str, data: &impl Serialize) {
        match self {
            Writer::BaseDir(dir) => {
                let parent = dir.join(parent);
                match fs::create_dir(&parent) {
                    Ok(()) => (),
                    Err(err) if err.kind() == io::ErrorKind::AlreadyExists => (),
                    Err(err) => eprintln!("The directory {parent:?} is not created: {err}"),
                }

                let mut file_path = parent.join(fname_stem);
                file_path.set_extension("json");

                match fs::File::create(&file_path) {
                    Ok(file) => serde_json::to_writer_pretty(file, data).unwrap(),
                    Err(err) => eprintln!("{file_path:?} {err:?}"),
                }
            }
            Writer::Stdout => {
                use io::Write;
                let stdout = &mut io::stdout();
                _ = writeln!(stdout);
                serde_json::to_writer_pretty(&mut *stdout, data).unwrap();
                _ = writeln!(stdout);
            }
        }
    }
}

/// The base directory `$UPG_DIR/crate_name` to store JSONs data.
/// If the environment variable `UPG_DIR` is not set, data will be printed to stdout.
pub fn base_dir(crate_name: &str) -> Option<PathBuf> {
    std::env::var("UPG_DIR")
        .ok()
        .map(|dir| PathBuf::from(dir).join(crate_name))
}
