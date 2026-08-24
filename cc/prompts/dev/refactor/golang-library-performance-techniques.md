# Go Library Performance Optimization Techniques

Use this as a systematic performance-review checklist for shared Golang libraries.

The goal is not clever micro-optimization. The goal is measurable, high-leverage runtime improvement that benefits every downstream consumer.

Core rule:

> No performance claim without benchmark or profile evidence.

Preferred workflow:

> evidence → hypothesis → benchmark/profile → change → benchmark/profile → measurable result

Prioritize opportunities roughly in this order:

1. Algorithmic complexity
2. Excess allocations / GC pressure
3. Repeated work
4. Excess copying
5. Batching opportunities
6. Serialization overhead
7. Lock contention
8. Goroutine / channel overhead
9. Buffer reuse
10. Preallocation
11. Lazy evaluation / fast paths
12. Reflection / interface overhead
13. Data layout / cache locality
14. Escape analysis / inlining / bounds-check elimination
15. Instruction-level micro-optimizations

---

## 1. Reduce Allocations and GC Pressure

Allocation reduction is often one of the highest-ROI optimizations in Go libraries.

Look for:

- `make` inside hot loops
- repeated `append` growth
- temporary slices/maps/structs
- unnecessary pointers
- `fmt.Sprintf` in hot paths
- `[]byte(string)` and `string([]byte)` conversions
- closures that force values to escape
- per-request `bytes.Buffer`
- temporary wrapper objects

Measure:

- `ns/op`
- `B/op`
- `allocs/op`
- heap growth
- GC frequency and pause contribution

Prefer removing work entirely before pooling objects.

---

## 2. Preallocate Slices, Maps, and Buffers

If the approximate output size is known, allocate capacity up front.

Examples:

```go
result := make([]Thing, 0, len(input))
```

```go
m := make(map[string]Entry, len(entries))
```

Look for slices that repeatedly grow from zero capacity and maps populated from an already-sized collection.

This is usually a low-risk optimization and a good candidate for small focused PRs.

---

## 3. Reuse Buffers Carefully

Libraries involving Kafka, logging, telemetry, codecs, HTTP, compression, or binary protocols often allocate large numbers of short-lived buffers.

Candidates:

- `bytes.Buffer`
- byte slices
- encoder scratch memory
- compression buffers
- protocol framing buffers

Possible mechanisms:

- caller-owned reusable buffers
- append-style APIs
- bounded internal pools
- `sync.Pool`

Do not introduce pooling blindly. Check for:

- oversized object retention
- increased memory footprint
- pool contention
- lifecycle complexity
- objects that are already cheap to allocate

A strong result looks like:

> Reduce encoder allocations from 14 to 3 per message with bounded reusable buffers.

Not merely:

> Add `sync.Pool`.

---

## 4. Eliminate Unnecessary Copies

Trace payload ownership through the full call path.

Typical copy chain:

```text
network buffer
  → decoder buffer
  → message representation
  → middleware representation
  → client/output buffer
```

Search for:

- `copy`
- `append(dst, src...)`
- `bytes.Clone`
- `[]byte(s)`
- `string(b)`
- intermediate serialization objects

Large payloads copied multiple times can dominate CPU and memory bandwidth.

Zero-copy designs require explicit ownership and lifetime rules. Never trade correctness for a benchmark win.

---

## 5. Batch Work

Batching can produce order-of-magnitude improvements because it reduces fixed overhead.

Look for operations performed once per item that could become once per batch:

- network writes
- Kafka operations
- syscalls
- metric emission
- logging
- serialization setup
- locking
- database calls
- filesystem operations

Prefer:

```text
encode
encode
encode
write batch
```

instead of:

```text
encode
write
encode
write
encode
write
```

Measure throughput, tail latency, memory growth, and backpressure behavior. Batching often introduces latency/throughput trade-offs.

---

## 6. Improve Algorithmic Complexity

Do not micro-optimize an unnecessarily expensive algorithm.

Look for:

- nested loops
- repeated linear searches
- repeated sorting
- sorting only to find min/max/top-N
- rebuilding indexes/maps
- repeated deduplication scans
- repeated hashing
- repeated parsing

Typical transformations:

```text
O(n*m) → O(n+m)
O(n log n) → O(n)
repeated scan → indexed lookup
```

Algorithmic improvements are often the highest-value RFCs because gains increase with workload size.

---

## 7. Cache Expensive Immutable Work

Search for repeated work whose input rarely changes:

- regex compilation
- URL parsing
- schema parsing
- template parsing
- codec construction
- metadata derivation
- configuration normalization
- reflection metadata discovery
- hash/table initialization

Ask whether work can move from:

```text
per message → per batch
per request → per client
per operation → initialization
```

Cache only when invalidation and memory ownership are clear.

---

## 8. Reduce Lock Contention

Look for mutexes on frequently executed shared paths.

Patterns to inspect:

```go
mu.Lock()
defer mu.Unlock()
```

especially around large critical sections.

Possible improvements:

```text
global lock → sharded locks
write lock → RWMutex where reads dominate
shared mutable state → immutable snapshots
mutex-protected scalar → atomic
lock per item → lock per batch
```

Do not optimize using single-thread benchmarks only.

Benchmark representative concurrency levels, for example:

```text
1 goroutine
8 goroutines
32 goroutines
128 goroutines
```

Use contention profiles when possible.

---

## 9. Audit Goroutine Lifecycle

Goroutines are cheap, not free.

Search for:

- goroutine per message
- goroutine per callback
- goroutine per retry
- unbounded fan-out
- timer per operation
- channels created for one result
- background goroutine leaks

Possible alternatives:

- synchronous fast path
- worker pools
- bounded concurrency
- batching
- shared schedulers/timers

Measure:

- goroutine count
- scheduler CPU
- context switches
- memory footprint
- tail latency under overload

---

## 10. Challenge Channel-Based Designs

Channels are useful coordination primitives, not mandatory architecture.

Inspect flows such as:

```text
producer → channel → goroutine → shared state
```

A simpler mechanism may outperform it:

```text
producer → mutex/state
```

For scalar state consider atomics such as:

```go
atomic.Int64
atomic.Pointer[T]
```

Choose synchronization based on semantics and measurement, not idiom alone.

---

## 11. Reduce Reflection and Interface Overhead

Reflection-heavy generic APIs can become expensive in hot paths.

Search for:

- `reflect.ValueOf`
- `reflect.TypeOf`
- `interface{}` / `any` conversion chains
- large type switches
- repeated reflection metadata discovery

Possible approaches:

```text
reflection → cached metadata
reflection → generics
reflection → generated code
generic API → typed fast path for common cases
```

Keep a generic public API when useful; optimize the common internal path rather than degrading usability.

---

## 12. Optimize Serialization Paths

Serialization is frequently a top CPU/allocation consumer in shared libraries.

Look for intermediate representations such as:

```text
struct
 → map[string]any
 → JSON
```

or redundant decode/encode cycles:

```text
protobuf
 → object
 → protobuf
```

Potential improvements:

- direct encoding
- append-based encoders
- pre-sized destination buffers
- encoder reuse
- generated codecs
- lazy decoding
- partial decoding
- avoiding intermediate objects
- caching schema/reflection metadata

Always benchmark realistic payload sizes and distributions.

---

## 13. Make Work Lazy

A library often computes information callers never use.

Examples:

- parsing optional headers
- decoding payload fields eagerly
- building tracing attributes
- formatting disabled debug logs
- constructing expensive error strings on success paths

Prefer performing work only when required.

Example:

```go
if logger.DebugEnabled() {
    // build expensive debug fields
}
```

Lazy work is especially valuable for optional features used by a minority of callers.

---

## 14. Add Common-Case Fast Paths

Keep general behavior but make the dominant path cheap.

Pattern:

```go
if commonCase {
    // minimal work
    return result
}
return generalCase(...)
```

Potential fast paths:

- empty payload
- no headers
- no tracing
- no compression
- no retry
- cached configuration
- common encoding type
- single-element batch
- already-normalized input

A fast path is valuable when production traffic strongly favors it.

---

## 15. Improve Data Layout and Cache Locality

For high-throughput code, memory layout can matter as much as instruction count.

Inspect:

- `[]*Struct` versus `[]Struct`
- pointer-heavy graphs
- linked lists
- nested maps
- many tiny heap objects
- oversized structs
- hot and cold fields mixed together

Goals:

- reduce pointer chasing
- improve contiguous access
- reduce heap object count
- keep frequently accessed fields compact

Use benchmarks and profiles before introducing less-readable layouts.

---

## 16. Help the Compiler

Only after larger opportunities have been addressed, inspect compiler-level behavior.

Areas:

- escape analysis
- inlining
- bounds-check elimination
- devirtualization
- branch predictability

Useful commands:

```bash
go test -bench=. -benchmem
go test -gcflags='-m=2'
go tool pprof
go tool trace
```

Do not contort readable code solely to satisfy the compiler unless the benchmark proves material benefit.

---

## 17. Evaluate PGO

For representative production workloads, Profile-Guided Optimization may provide additional gains.

More important than simply enabling PGO is having a representative benchmark/profile corpus.

A useful investigation:

```text
establish representative workload
→ capture CPU profile
→ evaluate PGO
→ identify compiler-visible hot paths
→ benchmark improvement
```

---

# Required Benchmark Discipline

Every proposed performance change must include a reproducible before/after benchmark.

Example report:

```text
BenchmarkEncode-16

before:
  8,420 ns/op
  12,480 B/op
  37 allocs/op

after:
  5,110 ns/op
   4,096 B/op
  11 allocs/op

change:
  -39.3% ns/op
  -67.2% B/op
  -70.3% allocs/op
```

Where relevant also report:

- throughput
- p50/p95/p99 latency
- CPU profile deltas
- heap profile deltas
- mutex/block profile deltas
- goroutine count
- GC frequency
- memory retention
- performance under concurrency
- behavior under overload

Use `benchstat` or equivalent statistical comparison when benchmark noise is non-trivial.

---

# Review Heuristic

For every hot-path operation, ask these questions in order:

1. Can this work be removed entirely?
2. Can it happen less frequently?
3. Can it move from per-item to per-batch/per-client/initialization?
4. Can the result be cached or reused safely?
5. Can copies or allocations be removed?
6. Can contention be reduced?
7. Can the remaining operation be implemented faster?

The strongest performance PRs usually make the system do less work, not merely execute the same work with cleverer syntax.
