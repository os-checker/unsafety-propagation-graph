fn main() {
    let s = S {
        a: String::new(),
        b: String::new(),
    };
    let ea = E::A(String::new());
    let eb = E::B(String::new());
}

struct S {
    a: String,
    b: String,
}

enum E {
    A(String),
    B(String),
}
