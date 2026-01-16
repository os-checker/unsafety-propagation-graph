use std::fmt::Debug;
use std::fmt::LowerExp;
use std::num::FpCategory;
use std::ops::*;

/// Lossy `as` casting between two types.
pub trait CastInto<T: Copy>: Copy {
    fn cast(self) -> T;
}

pub trait Integer:
    Sized
    + Clone
    + Copy
    + Debug
    + Shr<u32, Output = Self>
    + Shl<u32, Output = Self>
    + BitAnd<Output = Self>
    + BitOr<Output = Self>
    + PartialEq
    + CastInto<i16>
{
    const ZERO: Self;
    const ONE: Self;
}

pub trait RawFloat:
    Sized
    + Div<Output = Self>
    + Neg<Output = Self>
    + Mul<Output = Self>
    + Add<Output = Self>
    + LowerExp
    + PartialEq
    + PartialOrd
    + Default
    + Clone
    + Copy
    + Debug
{
    /// The unsigned integer with the same size as the float
    type Int: Integer + Into<u64>;

    /* general constants */

    const INFINITY: Self;
    const NEG_INFINITY: Self;
    const NAN: Self;
    const NEG_NAN: Self;

    /// Bit width of the float
    const BITS: u32;

    /// The number of bits in the significand, *including* the hidden bit.
    const SIG_TOTAL_BITS: u32;

    const EXP_MASK: Self::Int;
    const SIG_MASK: Self::Int;

    /// The number of bits in the significand, *excluding* the hidden bit.
    const SIG_BITS: u32 = Self::SIG_TOTAL_BITS - 1;

    /// Number of bits in the exponent.
    const EXP_BITS: u32 = Self::BITS - Self::SIG_BITS - 1;

    /// The saturated (maximum bitpattern) value of the exponent, i.e. the infinite
    /// representation.
    ///
    /// This shifted fully right, use `EXP_MASK` for the shifted value.
    const EXP_SAT: u32 = (1 << Self::EXP_BITS) - 1;

    /// Signed version of `EXP_SAT` since we convert a lot.
    const INFINITE_POWER: i32 = Self::EXP_SAT as i32;

    /// The exponent bias value. This is also the maximum value of the exponent.
    const EXP_BIAS: u32 = Self::EXP_SAT >> 1;

    /// Minimum exponent value of normal values.
    const EXP_MIN: i32 = -(Self::EXP_BIAS as i32 - 1);

    /// Round-to-even only happens for negative values of q
    /// when q ≥ −4 in the 64-bit case and when q ≥ −17 in
    /// the 32-bitcase.
    ///
    /// When q ≥ 0,we have that 5^q ≤ 2m+1. In the 64-bit case,we
    /// have 5^q ≤ 2m+1 ≤ 2^54 or q ≤ 23. In the 32-bit case,we have
    /// 5^q ≤ 2m+1 ≤ 2^25 or q ≤ 10.
    ///
    /// When q < 0, we have w ≥ (2m+1)×5^−q. We must have that w < 2^64
    /// so (2m+1)×5^−q < 2^64. We have that 2m+1 > 2^53 (64-bit case)
    /// or 2m+1 > 2^24 (32-bit case). Hence,we must have 2^53×5^−q < 2^64
    /// (64-bit) and 2^24×5^−q < 2^64 (32-bit). Hence we have 5^−q < 2^11
    /// or q ≥ −4 (64-bit case) and 5^−q < 2^40 or q ≥ −17 (32-bitcase).
    ///
    /// Thus we have that we only need to round ties to even when
    /// we have that q ∈ [−4,23](in the 64-bit case) or q∈[−17,10]
    /// (in the 32-bit case). In both cases,the power of five(5^|q|)
    /// fits in a 64-bit word.
    const MIN_EXPONENT_ROUND_TO_EVEN: i32;
    const MAX_EXPONENT_ROUND_TO_EVEN: i32;

    /* limits related to Fast pathing */

    /// Largest decimal exponent for a non-infinite value.
    ///
    /// This is the max exponent in binary converted to the max exponent in decimal. Allows fast
    /// pathing anything larger than `10^LARGEST_POWER_OF_TEN`, which will round to infinity.
    const LARGEST_POWER_OF_TEN: i32 = {
        let largest_pow2 = Self::EXP_BIAS + 1;
        pow2_to_pow10(largest_pow2 as i64) as i32
    };

    /// Smallest decimal exponent for a non-zero value. This allows for fast pathing anything
    /// smaller than `10^SMALLEST_POWER_OF_TEN`, which will round to zero.
    ///
    /// The smallest power of ten is represented by `⌊log10(2^-n / (2^64 - 1))⌋`, where `n` is
    /// the smallest power of two. The `2^64 - 1)` denomenator comes from the number of values
    /// that are representable by the intermediate storage format. I don't actually know _why_
    /// the storage format is relevant here.
    ///
    /// The values may be calculated using the formula. Unfortunately we cannot calculate them at
    /// compile time since intermediates exceed the range of an `f64`.
    const SMALLEST_POWER_OF_TEN: i32;

    /// Maximum exponent for a fast path case, or `⌊(SIG_BITS+1)/log2(5)⌋`
    // assuming FLT_EVAL_METHOD = 0
    const MAX_EXPONENT_FAST_PATH: i64 = {
        let log2_5 = std::f64::consts::LOG2_10 - 1.0;
        (Self::SIG_TOTAL_BITS as f64 / log2_5) as i64
    };

    /// Minimum exponent for a fast path case, or `-⌊(SIG_BITS+1)/log2(5)⌋`
    const MIN_EXPONENT_FAST_PATH: i64 = -Self::MAX_EXPONENT_FAST_PATH;

    /// Maximum exponent that can be represented for a disguised-fast path case.
    /// This is `MAX_EXPONENT_FAST_PATH + ⌊(SIG_BITS+1)/log2(10)⌋`
    const MAX_EXPONENT_DISGUISED_FAST_PATH: i64 = Self::MAX_EXPONENT_FAST_PATH
        + (Self::SIG_TOTAL_BITS as f64 / std::f64::consts::LOG2_10) as i64;

    /// Maximum mantissa for the fast-path (`1 << 53` for f64).
    const MAX_MANTISSA_FAST_PATH: u64 = 1 << Self::SIG_TOTAL_BITS;

    /// Converts integer into float through an as cast.
    /// This is only called in the fast-path algorithm, and therefore
    /// will not lose precision, since the value will always have
    /// only if the value is <= Self::MAX_MANTISSA_FAST_PATH.
    fn from_u64(v: u64) -> Self;

    /// Performs a raw transmutation from an integer.
    fn from_u64_bits(v: u64) -> Self;

    /// Gets a small power-of-ten for fast-path multiplication.
    fn pow10_fast_path(exponent: usize) -> Self;

    /// Returns the category that this number falls into.
    fn classify(self) -> FpCategory;

    /// Transmute to the integer representation
    fn to_bits(self) -> Self::Int;

    /// Returns the mantissa, exponent and sign as integers.
    ///
    /// That is, this returns `(m, p, s)` such that `s * m * 2^p` represents the original float.
    /// For 0, the exponent will be `-(EXP_BIAS + SIG_BITS`, which is the
    /// minimum subnormal power.
    fn integer_decode(self) -> (u64, i16, i8) {
        let bits = self.to_bits();
        let sign: i8 = if bits >> (Self::BITS - 1) == Self::Int::ZERO {
            1
        } else {
            -1
        };
        let mut exponent: i16 = ((bits & Self::EXP_MASK) >> Self::SIG_BITS).cast();
        let mantissa = if exponent == 0 {
            (bits & Self::SIG_MASK) << 1
        } else {
            (bits & Self::SIG_MASK) | (Self::Int::ONE << Self::SIG_BITS)
        };
        // Exponent bias + mantissa shift
        exponent -= (Self::EXP_BIAS + Self::SIG_BITS) as i16;
        (mantissa.into(), exponent, sign)
    }
}

/// Solve for `b` in `10^b = 2^a`
const fn pow2_to_pow10(a: i64) -> i64 {
    let res = (a as f64) / std::f64::consts::LOG2_10;
    res as i64
}
