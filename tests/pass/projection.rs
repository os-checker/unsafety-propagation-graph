struct A {
    a: Vec<u8>,
}

impl A {
    fn cap(&self) -> usize {
        self.a.capacity()
    }
}
