use crate::info_mod::{
    DefPath, DefPathKind, FlattenFreeItems, ItemPath, def_path, is_local_path,
    push_plain_item_path, put_under_phony,
};
use crate::utils::FxIndexMap;
use itertools::Itertools;
use rustc_hir::{ImplItemImplKind, ImplItemKind, ItemKind};
use rustc_middle::ty::TyCtxt;
use serde::Serialize;
use std::mem;

pub fn run(tcx: TyCtxt) -> Navigation {
    let free = free_items(tcx);
    let tree = make_tree(&free.v_path, tcx);
    Navigation::new(tree, &free)
}

#[derive(Debug, PartialEq, PartialOrd, Eq, Ord, Serialize)]
pub struct Tree {
    pub node: Node,
    pub sub: Vec<Tree>,
}

impl Tree {
    fn new(def_path: DefPath) -> Self {
        Tree {
            node: Node { inner: def_path },
            sub: Vec::new(),
        }
    }

    fn push_direct_sub(&mut self, def_path: DefPath) -> &mut Self {
        if let Some(pos) = self
            .sub
            .iter_mut()
            .position(|sub| sub.node.inner == def_path)
        {
            // Move the node to last.
            let last_idx = self.sub.len() - 1;
            self.sub.swap(pos, last_idx);
        } else {
            self.sub.push(Tree::new(def_path));
        }
        // The last element must has the same node as def_path given.
        self.sub.last_mut().unwrap()
    }

    fn push(&mut self, v_path: &ItemPath) {
        let mut tree = self;
        for def_path in v_path {
            if *def_path != tree.node.inner {
                tree = tree.push_direct_sub(def_path.clone());
            }
        }
    }

    fn sort(&mut self) {
        self.sub.sort_unstable();
        // Recuirsively sort.
        for subtree in &mut self.sub {
            subtree.sort();
        }
    }

    fn find_idx(&self, v_path: &ItemPath, buf: &mut Vec<usize>) {
        let mut tree = self;
        for def_path in v_path {
            if *def_path != tree.node.inner {
                if let Some(pos) = tree.sub.iter().position(|t| *def_path == t.node.inner) {
                    buf.push(pos);
                    tree = &tree.sub[pos];
                } else {
                    panic!("{def_path:?} nost found in {tree:?}");
                }
            }
        }
    }
}

#[derive(Clone, Debug, PartialEq, PartialOrd, Eq, Ord, Serialize)]
pub struct Node {
    #[serde(flatten)]
    pub inner: DefPath,
}

#[derive(Serialize)]
pub struct Navigation {
    pub tree: Tree,
    pub name_to_node: FxIndexMap<String, String>,
    pub node_to_name: FxIndexMap<String, String>,
}

impl Navigation {
    fn new(mut tree: Tree, free: &FreeItems) -> Self {
        // Sort the subtrees to have stable idx.
        tree.sort();

        let n = free.name_to_path.len();
        let mut name_to_node =
            FxIndexMap::<String, String>::with_capacity_and_hasher(n, Default::default());

        let mut buf = Vec::<usize>::new();
        for (fn_name, v_path) in &free.name_to_path {
            tree.find_idx(v_path, &mut buf);
            // For simplicity, indices is a string like `1,1,...` to all subtrees.
            let v_idx_str = format!("{:?}", buf.iter().format(","));
            name_to_node.insert(fn_name.clone(), v_idx_str);
            // node_to_name.insert(v_idx_str, fn_name.clone());
            buf.clear();
        }
        name_to_node.sort_unstable_keys();

        let mut node_to_name: FxIndexMap<_, _> = name_to_node
            .iter()
            .map(|(k, v)| (v.clone(), k.clone()))
            .collect();
        node_to_name.sort_unstable_keys();

        Navigation {
            tree,
            name_to_node,
            node_to_name,
        }
    }
}

#[derive(Default)]
pub struct FreeItems {
    v_path: FlattenFreeItems,
    name_to_path: FxIndexMap<String, ItemPath>,
}

pub fn make_tree(v_path: &FlattenFreeItems, tcx: TyCtxt) -> Tree {
    let crate_root = DefPath::crate_root(tcx);
    let mut tree = Tree {
        node: Node {
            inner: crate_root.clone(),
        },
        sub: Vec::new(),
    };

    for free_item in v_path {
        tree.push(free_item);
    }

    tree
}

fn free_items(tcx: TyCtxt) -> FreeItems {
    let mut this = FreeItems::default();
    let FreeItems {
        v_path,
        name_to_path,
    } = &mut this;
    let crate_root = DefPath::crate_root(tcx);

    // Free items: those items may be inaccesible from user's perspective,
    // and item paths are as per source code definitions.
    for item_id in tcx.hir_free_items() {
        let item = tcx.hir_item(item_id);
        match &item.kind {
            ItemKind::Fn { ident, .. } => {
                push_plain_item_path(
                    DefPathKind::Fn,
                    ident,
                    &item_id,
                    tcx,
                    v_path,
                    &crate_root,
                    name_to_path,
                );
            }
            ItemKind::Struct(ident, ..) => {
                push_plain_item_path(
                    DefPathKind::Struct,
                    ident,
                    &item_id,
                    tcx,
                    v_path,
                    &crate_root,
                    name_to_path,
                );
            }
            ItemKind::Enum(ident, ..) => {
                push_plain_item_path(
                    DefPathKind::Enum,
                    ident,
                    &item_id,
                    tcx,
                    v_path,
                    &crate_root,
                    name_to_path,
                );
            }
            ItemKind::Union(ident, ..) => {
                push_plain_item_path(
                    DefPathKind::Union,
                    ident,
                    &item_id,
                    tcx,
                    v_path,
                    &crate_root,
                    name_to_path,
                );
            }
            ItemKind::Trait(_, _, _, ident, ..) => {
                push_plain_item_path(
                    DefPathKind::TraitDecl,
                    ident,
                    &item_id,
                    tcx,
                    v_path,
                    &crate_root,
                    name_to_path,
                );
            }
            ItemKind::Impl(imp) => {
                for id in imp.items {
                    let assoc = tcx.hir_impl_item(*id);
                    if let ImplItemKind::Fn(_, body) = assoc.kind {
                        let mut impl_path = DefPath::from_ty(imp.self_ty, tcx, &crate_root);
                        let fn_name = assoc.ident.as_str();
                        match assoc.impl_kind {
                            ImplItemImplKind::Inherent { .. } => {
                                impl_path.push(DefPath::new(DefPathKind::AssocFn, fn_name));
                            }
                            ImplItemImplKind::Trait {
                                trait_item_def_id, ..
                            } => {
                                if let Ok(did) = trait_item_def_id {
                                    let trait_did =
                                        tcx.opt_associated_item(did).unwrap().container_id(tcx);
                                    let mut trait_path = def_path(trait_did, tcx);
                                    if is_local_path(&impl_path, &crate_root) {
                                        // The Self type is local, and put trait fn under Self.
                                        // Repr: [local type path, trait path, assoc fn]
                                        impl_path.extend(trait_path);
                                    } else if is_local_path(&trait_path, &crate_root) {
                                        // The trait is local, but Self is not, so put fn under trait.
                                        // Repr [local trait path, external type path, assoc fn]
                                        trait_path.extend(mem::take(&mut impl_path));
                                        impl_path = trait_path;
                                    } else {
                                        // Neither Self or trait is not local. This is possible
                                        // when Self is a fundamental type (see
                                        // https://doc.rust-lang.org/reference/items/implementations.html#r-items.impl.trait.orphan-rule
                                        // ), or coherence rules are relaxed to the whole project.
                                        // As a workaround, we still have crate name as root, but
                                        // set a phony submodule `__phony` before item path.
                                        impl_path.extend(trait_path);
                                        impl_path = put_under_phony(impl_path, &crate_root);
                                    }
                                    impl_path.push(DefPath::new(DefPathKind::AssocFn, fn_name));
                                }
                            }
                        }
                        v_path.push(impl_path.clone());
                        let def_path_str = tcx.def_path_str(body.hir_id.owner);
                        let def_path_str = format!("{}::{def_path_str}", crate_root.name);
                        name_to_path.insert(def_path_str, impl_path);
                    }
                }
            }
            _ => (),
        }
    }

    // Put fully external root under __phony
    let f = |v| normalize_root(v, &crate_root);
    v_path.iter_mut().for_each(f);
    name_to_path.values_mut().for_each(f);

    this
}

fn normalize_root(item_path: &mut ItemPath, crate_root: &DefPath) {
    if item_path[0] != *crate_root {
        eprintln!("{item_path:?} must start from {crate_root:?}");
        // This is the escape hatch to not break the root principle.
        *item_path = put_under_phony(item_path.clone(), crate_root)
    }
}
