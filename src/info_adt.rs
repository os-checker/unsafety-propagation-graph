use crate::{
    adt::{Adt, AdtAccess},
    info_fn::FnInfo,
    utils::{FxIndexMap, ThinVec},
};
use rustc_hir::def_id::DefId;
use rustc_middle::ty::{Ty, TyCtxt, TyKind};
use rustc_public::{
    CrateDef,
    rustc_internal::internal,
    ty::{AdtDef, FnDef},
};
use serde::Serialize;

pub fn adt_info(map_fn: &FxIndexMap<FnDef, FnInfo>, tcx: TyCtxt) -> FxIndexMap<Adt, AdtInfo> {
    let mut map_adt =
        FxIndexMap::<Adt, AdtInfo>::with_capacity_and_hasher(map_fn.len(), Default::default());

    for (&fn_def, fn_info) in map_fn {
        // Append the fn_def to adt map.
        for (adt, locals) in &fn_info.adts {
            let adt_info = map_adt.entry(adt.clone()).or_default();

            for access in &locals.access {
                let v = adt_info.map.entry(access.clone()).or_default();
                let (fn_kind, receiver) = fn_kind(fn_def, tcx);
                v.push(FnDefAdt {
                    fn_def,
                    as_argument: locals.is_argument(fn_info.arg_count),
                    fn_kind,
                    receiver,
                });
            }
        }

        // Append the constructor for adt.
        for adt in &fn_info.ret_adts {
            let adt_info = map_adt.entry(adt.clone()).or_default();
            adt_info.constructors.push(fn_def);
        }
    }

    // Initialize the rest fields.
    for (adt, info) in &mut map_adt {
        info.init(adt);
    }

    map_adt
}

#[derive(Debug, Default)]
pub struct AdtInfo {
    /// The variant access appear in user functions.
    pub map: FxIndexMap<AdtAccess, ThinVec<FnDefAdt>>,
    /// Functions in the form of `fn(...) -> Self`.
    pub constructors: ThinVec<FnDef>,
    /// Functions that access the whole adt appearing as arguments.
    /// Like `fn(&self)`, `fn(Self)`, ....
    pub as_argument: Access,
    /// Functions that access the whole adt otherwise (probably as plain locals).
    pub otherwise: Access,
    /// Functions that access the fields. The slice index corresponds to the field index.
    /// If the adt is not a struct, or unit struct (struct without field), the slices is empty.
    pub fields: Box<[Access]>,
}

impl AdtInfo {
    /// The function initializes the rest fields when `map` is ready.
    fn init(&mut self, adt: &Adt) {
        // Initialize field access.
        self.fields = adt
            .num_fields()
            .map(|len| vec![Access::default(); len].into())
            .unwrap_or_default();

        // Backfill access to adt and fields.
        for (access, v_fn) in &self.map {
            let push = |as_arg: &mut ThinVec<FnDef>, other: &mut ThinVec<FnDef>| {
                for f in v_fn {
                    if f.as_argument {
                        as_arg.push(f.fn_def);
                    } else {
                        other.push(f.fn_def);
                    }
                }
            };
            match access {
                AdtAccess::Ref => push(&mut self.as_argument.read, &mut self.otherwise.read),
                AdtAccess::MutRef | AdtAccess::Deref => {
                    push(&mut self.as_argument.write, &mut self.otherwise.write)
                }
                AdtAccess::Plain | AdtAccess::Unknown(_) => {
                    push(&mut self.as_argument.other, &mut self.otherwise.other)
                }
                AdtAccess::RefVariantField(idx) => {
                    // TODO: only structs are supported for now.
                    if let Some(idx) = idx.as_field_idx()
                        && adt.def.kind().is_struct()
                    {
                        if let Some(field) = self.fields.get_mut(idx) {
                            field.read = v_fn.iter().map(|f| f.fn_def).collect();
                        } else {
                            let fields_len = self.fields.len();
                            eprintln!(
                                "Out of bounds: fields_len={fields_len} idx={idx} adt={adt:?}"
                            )
                        }
                    }
                }
                AdtAccess::MutRefVariantField(idx) | AdtAccess::DerefVariantField(idx) => {
                    // TODO: only structs are supported for now.
                    if let Some(idx) = idx.as_field_idx()
                        && adt.def.kind().is_struct()
                    {
                        if let Some(field) = self.fields.get_mut(idx) {
                            field.write = v_fn.iter().map(|f| f.fn_def).collect();
                        } else {
                            let fields_len = self.fields.len();
                            eprintln!(
                                "Out of bounds: fields_len={fields_len} idx={idx} adt={adt:?}"
                            )
                        }
                    }
                }
            }
        }

        // Extract adts from type parameter.
    }
}

#[derive(Debug)]
pub struct FnDefAdt {
    pub fn_def: FnDef,
    pub as_argument: bool,
    pub fn_kind: FnKind,
    pub receiver: Option<Receiver>,
}

#[derive(Clone, Copy, Debug, PartialEq, PartialOrd, Eq, Ord)]
pub enum FnKind {
    Method,
    AssocFn,
    FreeFn,
}

#[derive(Clone, Copy, Debug)]
pub struct Receiver {
    adt: DefId,
    kind: ReceiverKind,
}

#[derive(Clone, Copy, Debug)]
pub enum ReceiverKind {
    Owned,
    MutableRef,
    ImmutableRef,
}

fn fn_kind(fn_def: FnDef, tcx: TyCtxt) -> (FnKind, Option<Receiver>) {
    let did = internal(tcx, fn_def.def_id());
    let Some(assoc) = tcx.opt_associated_item(did) else {
        return (FnKind::FreeFn, None);
    };
    if assoc.is_method() {
        let fn_sig = tcx.fn_sig(did).instantiate_identity();
        let inputs = fn_sig.inputs();
        let receiver_ty: Ty = inputs.skip_binder()[0]; // Self type

        // We could traverse the adt generic arguments, but for simplicity, only one layer here
        let receiver = match receiver_ty.kind() {
            TyKind::Adt(adt_def, ..) => Some(Receiver {
                adt: adt_def.did(),
                kind: ReceiverKind::Owned,
            }),
            TyKind::Ref(_, ty, mutability) if let TyKind::Adt(adt_def, ..) = ty.kind() => {
                Some(Receiver {
                    adt: adt_def.did(),
                    kind: if mutability.is_mut() {
                        ReceiverKind::MutableRef
                    } else {
                        ReceiverKind::ImmutableRef
                    },
                })
            }
            _ => None,
        };

        (FnKind::Method, receiver)
    } else {
        (FnKind::AssocFn, None)
    }
}

/// Access a place w.r.t the adt or field.
#[derive(Clone, Debug, Default)]
pub struct Access {
    /// Functions that only read the place via Ref or RefField.
    /// FIXME: Interior mutability is not handled yet.
    pub read: ThinVec<FnDef>,
    /// Functions that can write the place via MutRef, Deref, MutRefField, or DerefVariant.
    pub write: ThinVec<FnDef>,
    /// Functions that in other ways access the place, like Plain or Unknown.
    pub other: ThinVec<FnDef>,
}

/// The less, the more strict/privileged kind.
#[derive(Clone, Copy, Debug, Serialize, PartialEq, PartialOrd, Eq, Ord)]
pub enum AdtFnKind {
    Constructor,
    MethodOwnedReceiver,
    MethodMutableRefReceiver,
    MethodImmutableRefReceiver,
    MutableAsArgument,
    ImmutableAsArgument,
    // The list is not exhuastive, because we can further look in to field access.
    // Fn,
}

/// Each FnDef may be affiliated to several Adts, but each Adt only has one kind
/// for such FnDef, because we choose the most privileged AdtFnKind for simplicity.
pub type AdtFnKindMap = FxIndexMap<AdtDef, AdtFnKind>;
pub type FnAdtMap = FxIndexMap<FnDef, AdtFnKindMap>;
/// The outer key is caller FnDef, the inner key is Callee FnDef name string.
/// AdtFnKindMap only collects Adts that are accessed directly in the caller.
/// We haven't push field access or interprcedural kinds.
pub type CallerCalleeMap = FxIndexMap<FnDef, FxIndexMap<String, AdtFnKindMap>>;

#[derive(Default)]
pub struct AdtFnCollector {
    pub fn_adt_map: FnAdtMap,
    pub caller_callee_map: CallerCalleeMap,
}

impl AdtFnCollector {
    pub fn new(
        map_adt: &FxIndexMap<Adt, AdtInfo>,
        map_fn: &FxIndexMap<FnDef, FnInfo>,
        tcx: TyCtxt,
    ) -> Self {
        let mut this = Self::default();
        let Self {
            fn_adt_map,
            caller_callee_map,
        } = &mut this;

        let mut map_fn_kind =
            FxIndexMap::<FnDef, (FnKind, Option<Receiver>)>::with_capacity_and_hasher(
                16,
                Default::default(),
            );
        for (adt, info) in map_adt {
            // Merge fn kinds for the adt.
            map_fn_kind.clear();
            for v_fn in info.map.values() {
                for f in v_fn {
                    map_fn_kind
                        .entry(f.fn_def)
                        .and_modify(|(kind, receiver)| {
                            *kind = (*kind).min(f.fn_kind);
                            *receiver = receiver.or(f.receiver);
                        })
                        .or_insert((f.fn_kind, f.receiver));
                }
            }

            let adt_did = internal(tcx, adt.def.def_id());
            for constructor in &info.constructors {
                push_adt_fn(fn_adt_map, adt, *constructor, AdtFnKind::Constructor);
            }
            for immutable in &info.as_argument.read {
                let adt_fn_kind = adt_fn_kind(
                    &map_fn_kind,
                    adt_did,
                    immutable,
                    AdtFnKind::ImmutableAsArgument,
                );
                push_adt_fn(fn_adt_map, adt, *immutable, adt_fn_kind);
            }
            for mutable in &info.as_argument.write {
                let adt_fn_kind =
                    adt_fn_kind(&map_fn_kind, adt_did, mutable, AdtFnKind::MutableAsArgument);
                push_adt_fn(fn_adt_map, adt, *mutable, adt_fn_kind);
            }
        }

        for (caller, info) in map_fn {
            let map = caller_callee_map.entry(*caller).or_default();
            for (callee, callee_info) in &info.callees {
                // Callee is an Instance, but we strip the mono types, and use FnDef name
                // as in output Function CalleeInfo.
                if let Some(adt_fn_kind) = fn_adt_map.get(callee) {
                    let adt_map = map
                        .entry(callee_info.non_instance_name.clone())
                        .or_default();
                    for adt in info.adts.keys() {
                        // Ignore mono types.
                        let adt = adt.def;
                        if let Some(kind) = adt_fn_kind.get(&adt) {
                            adt_map.insert(adt, *kind);
                        }
                    }
                }
            }
        }

        this
    }
}

fn adt_fn_kind(
    map_fn_kind: &FxIndexMap<FnDef, (FnKind, Option<Receiver>)>,
    adt_did: DefId,
    fn_def: &FnDef,
    default: AdtFnKind,
) -> AdtFnKind {
    let (kind, receiver) = map_fn_kind.get(fn_def).unwrap();
    match (kind, receiver) {
        (
            FnKind::Method,
            Some(Receiver {
                adt,
                kind: ReceiverKind::Owned,
            }),
        ) if *adt == adt_did => AdtFnKind::MethodOwnedReceiver,
        (
            FnKind::Method,
            Some(Receiver {
                adt,
                kind: ReceiverKind::MutableRef,
            }),
        ) if *adt == adt_did => AdtFnKind::MethodMutableRefReceiver,
        (
            FnKind::Method,
            Some(Receiver {
                adt,
                kind: ReceiverKind::ImmutableRef,
            }),
        ) if *adt == adt_did => AdtFnKind::MethodImmutableRefReceiver,
        _ => default,
    }
}

fn push_adt_fn(map: &mut FnAdtMap, adt: &Adt, fn_def: FnDef, fn_kind: AdtFnKind) {
    let adt_map = map.entry(fn_def).or_default();
    adt_map
        .entry(adt.def)
        // When the fn belongs to multiple kinds, we use the privileged one (in lower discreminate)
        .and_modify(|old| *old = fn_kind.min(*old))
        .or_insert(fn_kind);
}
