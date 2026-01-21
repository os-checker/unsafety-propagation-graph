use crate::FxIndexMap;
use rustc_hir::{ImplItemImplKind, ImplItemKind, ItemId, ItemKind, OwnerNode, Ty, def_id::DefId};
use rustc_middle::ty::{TyCtxt, TyKind};
use rustc_span::Ident;
use serde::Serialize;
use std::mem;

pub type ItemPath = Vec<DefPath>;
pub type FlattenFreeItems = Vec<ItemPath>;

pub fn navi(tcx: TyCtxt) -> Navigation {
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
            // id will be filled once the whole tree is sored.
            node: Node {
                inner: def_path,
                id: 0,
            },
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

    fn fill_id(&mut self, id: &mut usize) {
        self.node.id = *id;
        *id += 1;
        for subtree in &mut self.sub {
            subtree.fill_id(id);
        }
    }

    fn find_idx(&self, v_path: &ItemPath, buf: &mut Vec<usize>, id: &mut usize) {
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
        *id = tree.node.id;
    }
}

#[derive(Clone, Debug, PartialEq, PartialOrd, Eq, Ord, Serialize)]
pub struct Node {
    #[serde(flatten)]
    pub inner: DefPath,
    pub id: usize,
}

#[derive(Serialize)]
pub struct Navigation {
    pub tree: Tree,
    pub name_to_id: FxIndexMap<String, usize>,
    // pub name_to_node: FxIndexMap<String, String>,
    // pub node_to_name: FxIndexMap<String, String>,
}

impl Navigation {
    fn new(mut tree: Tree, free: &FreeItems) -> Self {
        // Sort the subtrees to have stable idx.
        tree.sort();
        // Depth first id.
        tree.fill_id(&mut 0);

        let n = free.name_to_path.len();
        let mut name_to_id =
            FxIndexMap::<String, usize>::with_capacity_and_hasher(n, Default::default());

        let mut buf = Vec::<usize>::new();
        let mut id = 0;
        for (fn_name, v_path) in &free.name_to_path {
            tree.find_idx(v_path, &mut buf, &mut id);
            name_to_id.insert(fn_name.clone(), id);

            id = 0;
            buf.clear();
        }

        // let mut name_to_node =
        //     FxIndexMap::<String, String>::with_capacity_and_hasher(n, Default::default());
        // let mut buf = Vec::<usize>::new();
        // for (fn_name, v_path) in &free.name_to_path {
        //     tree.find_idx(v_path, &mut buf);
        //     // For simplicity, indices is a string like `1,1,...` to all subtrees.
        //     let v_idx_str = format!("{:?}", buf.iter().format(","));
        //     name_to_node.insert(fn_name.clone(), v_idx_str);
        //     // node_to_name.insert(v_idx_str, fn_name.clone());
        //     buf.clear();
        // }
        // name_to_node.sort_unstable_keys();
        //
        // let mut node_to_name: FxIndexMap<_, _> = name_to_node
        //     .iter()
        //     .map(|(k, v)| (v.clone(), k.clone()))
        //     .collect();
        // node_to_name.sort_unstable_keys();

        Navigation { tree, name_to_id }
    }

    pub fn name_to_id(&self, name: &str) -> Option<usize> {
        self.name_to_id.get(name).copied()
    }

    pub fn crate_root(&self) -> &str {
        &self.tree.node.inner.name
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
            id: 0,
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

fn push_plain_item_path(
    kind: DefPathKind,
    ident: &Ident,
    item_id: &ItemId,
    tcx: TyCtxt,
    v_path: &mut Vec<ItemPath>,
    crate_root: &DefPath,
    map_name_to_path: &mut FxIndexMap<String, ItemPath>,
) {
    let mut path = vec![DefPath::new(kind, ident.as_str())];
    push_parent_paths(&mut path, item_id, tcx, crate_root);
    v_path.push(path.clone());
    let def_path_str = tcx.def_path_str(item_id.owner_id.to_def_id());
    let def_path_str = format!("{}::{def_path_str}", crate_root.name);
    map_name_to_path.insert(def_path_str, path);
}

fn push_parent_paths(path: &mut Vec<DefPath>, item_id: &ItemId, tcx: TyCtxt, crate_root: &DefPath) {
    for (_, owner_node) in tcx.hir_parent_owner_iter(item_id.hir_id()) {
        match owner_node {
            OwnerNode::Item(owner_item) => {
                if let ItemKind::Mod(mod_ident, _) = owner_item.kind {
                    path.push(DefPath::new(DefPathKind::Mod, mod_ident.as_str()));
                }
            }
            OwnerNode::Crate(_) => path.push(crate_root.clone()),
            _ => (),
        }
    }
    path.reverse();
}

#[derive(Clone, Debug, Serialize, PartialEq, PartialOrd, Eq, Ord, Hash)]
pub struct DefPath {
    pub kind: DefPathKind,
    pub name: Box<str>,
}

impl DefPath {
    pub fn new<S: Into<Box<str>>>(kind: DefPathKind, name: S) -> Self {
        Self {
            kind,
            name: name.into(),
        }
    }

    pub fn from_ty(ty: &Ty, tcx: TyCtxt, crate_root: &DefPath) -> Vec<Self> {
        let hir_id = ty.hir_id;
        // Convert hir Ty to middle Ty.
        let typ = tcx.type_of(hir_id.owner).skip_binder();
        // let typ = tcx
        //     .try_normalize_erasing_regions(TypingEnv::fully_monomorphized(), typ)
        //     .unwrap_or(typ);
        if let TyKind::Adt(def, _) = typ.kind() {
            def_path(def.did(), tcx)
        } else {
            // cc https://github.com/os-checker/unsafety-propagation-graph/issues/15
            vec![
                crate_root.clone(),
                Self::primitive(),
                Self::new(DefPathKind::Ty, typ.to_string()),
            ]
        }
    }

    fn crate_root(tcx: TyCtxt) -> Self {
        let crate_name = tcx.crate_name(rustc_span::def_id::CrateNum::ZERO);
        DefPath::new(DefPathKind::Mod, crate_name.as_str())
    }

    /// A fake submodule under root to host non-local items.
    fn phony() -> Self {
        // Should be `$root::__phony::non_local_items`.
        DefPath {
            kind: DefPathKind::Mod,
            name: "__phony".into(),
        }
    }

    /// A fake root submodule to host primitive types.
    /// cc https://github.com/os-checker/unsafety-propagation-graph/issues/15
    fn primitive() -> Self {
        DefPath {
            kind: DefPathKind::Mod,
            name: "__primitive".into(),
        }
    }
}

/// Put the item under `$root::__phony`.
/// cc https://github.com/os-checker/unsafety-propagation-graph/issues/19
fn put_under_phony(mut v: ItemPath, crate_root: &DefPath) -> ItemPath {
    v.reserve_exact(2);
    v.insert(0, DefPath::phony());
    v.insert(0, crate_root.clone());
    v
}

fn is_local_path(v: &[DefPath], crate_root: &DefPath) -> bool {
    if v.is_empty() {
        unimplemented!()
    } else {
        v[0] == *crate_root
    }
}

/// ADT path can be `[Mod, Adt]` where Adt is one of Struct, Enum, and Union.
///
/// Function path is a tricky, because there are cases like
/// * `[Mod, Fn]` for a free function.
/// * `[Mod, Struct, AssocFn]` for an inherent function.
/// * `[Mod, Struct, ImplTrait, AssocFn]` for a trait function.
/// * `[Mod, TraitDecl, AssocFn]` for a trait function definition.
/// * `[SelfTy, AssocFn]` for an unusual associated function like `impl &Adt`.
/// * `[Mod, ImplTrait, SelfTy, AssocFn]` for an unusual trait function like `impl Trait for &Adt`,
///   `impl Trait for (Adt1, Adt2)`, `impl<T> Trait for T`, or even `impl<T: Trait> Trait for T::U`.
#[derive(Clone, Copy, Default, Debug, Serialize, PartialEq, PartialOrd, Eq, Ord, Hash)]
pub enum DefPathKind {
    #[default]
    Mod,
    Fn,
    AssocFn,
    Struct,
    Enum,
    Union,
    TraitDecl,
    Ty,
    ImplTrait,
}

fn def_path(did: DefId, tcx: TyCtxt) -> Vec<DefPath> {
    use rustc_hir::{def::DefKind, definitions::DefPathData};

    let default = || vec![DefPath::new(DefPathKind::Ty, tcx.def_path_str(did))];

    let def_kind = tcx.def_kind(did);
    let def_path_kind = match def_kind {
        DefKind::Struct => DefPathKind::Struct,
        DefKind::Enum => DefPathKind::Enum,
        DefKind::Union => DefPathKind::Union,
        // TraitDecl has been handled in ItemKind::Trait; and def_path is called in ItemKind::Impl.
        DefKind::Trait => DefPathKind::ImplTrait,
        _ => return default(),
    };

    let mut v_path = Vec::new();
    let mod_path = tcx.def_path(did);
    let crate_name = tcx.crate_name(mod_path.krate);
    v_path.push(DefPath::new(DefPathKind::Mod, crate_name.as_str()));
    for data in &mod_path.data {
        if let DefPathData::TypeNs(sym) = data.data {
            v_path.push(DefPath::new(DefPathKind::Mod, sym.as_str()));
        } else {
            // cc https://github.com/os-checker/unsafety-propagation-graph/issues/12
            v_path.push(DefPath::new(DefPathKind::Mod, data.as_sym(true).as_str()));
        }
    }

    let last_path_seg = v_path.last_mut().unwrap();
    last_path_seg.kind = def_path_kind;
    v_path
}
