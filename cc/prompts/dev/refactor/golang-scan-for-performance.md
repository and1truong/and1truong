Prompt: Go Kafka Base Library — Performance Optimization Agent Swarm

You are a performance engineering swarm reviewing a shared Golang Kafka base library used by many downstream services.

Your job is to find real, measurable, high-leverage performance improvements.

This is not application code.

A small improvement in this library may automatically benefit every service using it.

Your standard is:

evidence → hypothesis → benchmark/profile → change → measurable result

And your guiding principle is:

small implementation change → broad runtime benefit across all consumers

Do not modify production code during this discovery pass.

⸻

1. Performance Goals

Optimize for realistic production workloads:

* messages/sec
* p50 / p95 / p99 latency
* CPU
* allocations/message
* bytes allocated/message
* GC pressure
* heap retention
* goroutine count
* scheduler overhead
* lock contention
* channel contention
* Kafka round trips
* commit frequency
* batching efficiency
* backpressure behavior
* degradation behavior

Do not optimize merely because code looks inefficient.

⸻

2. Go-Specific Principle

For every hot-path operation ask:

Can this work be avoided entirely?

Then:

Can per-message work become per-batch, per-partition, per-consumer, or initialization-time work?

Only then ask:

Can the remaining operation be implemented faster?

This ordering matters.

⸻

3. Build the Runtime Model

Map the important execution paths.

For consumer:

Kafka fetch
→ message representation
→ decode
→ dispatch
→ processor
→ success/failure classification
→ retry
→ redrive
→ deadletter
→ offset commit

For producer, if applicable:

caller
→ encode
→ message
→ batch
→ Kafka client
→ ack

Document:

* goroutines
* channels
* queues
* mutexes
* atomics
* timers
* contexts
* allocations
* copies
* serialization
* Kafka client calls
* batching boundaries
* commit boundaries
* retry loops
* partition ownership
* shutdown/draining
* metrics/logging

Identify anything executed:

* once per message
* once per batch
* once per partition
* once per consumer
* once at initialization

This distinction is critical.

⸻

4. Establish Real Baselines

Find existing:

* Go benchmarks
* performance tests
* load tests
* pprof profiles
* traces
* production metrics
* performance regression CI
* benchmark history

If missing, propose minimal benchmark harnesses.

Measure at least:

* ns/op
* B/op
* allocs/op
* throughput
* p50/p95/p99
* CPU utilization
* heap usage
* goroutines
* mutex wait
* block wait

Use multiple realistic workloads.

Examples:

Small messages

1–5 KB

Medium messages

10–100 KB

Large messages

100 KB–1 MB

High partition count

Large number of active partitions.

Fast processor

Near-zero application processing cost.

Useful for exposing library overhead.

Slow processor

Simulated downstream latency.

Failure-heavy

Retry/redrive/deadletter activity.

Saturation

Near sustainable maximum throughput.

Burst traffic

Temporary load spike.

⸻

5. Go Tooling

Use appropriate Go tooling where useful.

Examples:

go test -bench=. -benchmem

go test -bench=. -count=10

go test -run=^$ -bench=BenchmarkX

go tool pprof

go tool trace

go test -race

go build -gcflags='-m=2'

go test -gcflags='-m=2'

Use benchstat where available to compare before/after benchmark distributions.

Inspect:

* CPU profile
* heap profile
* alloc profile
* mutex profile
* block profile
* execution trace
* escape analysis

Do not trust one benchmark run.

⸻

6. Fan Out Into Specialist Agents

Spawn independent agents.

Each agent must report:

1. evidence
2. bottleneck hypothesis
3. affected hot path
4. proposed experiment
5. expected improvement
6. implementation complexity
7. risk
8. confidence

Agents should investigate different dimensions independently.

⸻

Agent A — Go Allocation Hunter

Find avoidable heap allocations.

Inspect:

* slice creation
* map creation
* temporary structs
* closures
* interface conversions
* variadic calls
* error construction
* fmt.*
* context values
* string formatting
* serialization buffers
* pointer escaping

Run escape analysis.

Pay special attention to:

[]byte ↔ string

and temporary data used only during one operation.

For every allocation ask:

Does this need to escape to the heap?

Then:

Does this allocation need to exist at all?

⸻

Agent B — GC & Memory Retention

Look beyond allocation counts.

Investigate:

* large backing arrays retained by small slices
* large Kafka message buffers retained accidentally
* buffers referenced after processing
* caches with unbounded growth
* maps that never shrink
* retry queues retaining payloads
* oversized reusable buffers
* object lifetimes
* high allocation rate causing frequent GC

Determine:

* live heap
* allocation rate
* retained heap
* GC CPU percentage
* pause behavior

Do not suggest changing GOGC before fixing unnecessary allocation/retention.

⸻

Agent C — Goroutine Architecture

Map every goroutine lifecycle.

Look for:

* goroutine per message
* goroutine per retry
* goroutine per timer
* unnecessary worker spawning
* unbounded goroutines
* leaked goroutines
* excessive synchronization
* goroutines mostly blocked on channels

Ask:

Is concurrency reducing latency, or merely creating scheduler work?

Look for opportunities to simplify ownership.

⸻

Agent D — Channel Performance

Inspect every hot-path channel.

Determine:

* buffered/unbuffered
* send frequency
* receive frequency
* number of writers
* number of readers
* blocking behavior
* contention
* ownership

Look for:

* ping-pong channels
* unnecessary channel hops
* channel used where direct function call would suffice
* shared fan-in bottlenecks
* too-small buffers
* huge buffers hiding backpressure

Do not blindly replace channels.

⸻

Agent E — Lock & Contention

Inspect:

* sync.Mutex
* sync.RWMutex
* sync.Map
* atomics
* shared maps
* global registries
* metric structures

Use mutex/block profiling where useful.

Identify:

* high-frequency locks
* long critical sections
* global contention
* cross-partition contention

Prefer ownership or partition-local state where architecture permits.

Do not introduce clever lock-free algorithms without strong evidence.

⸻

Agent F — Interface / Reflection / Generics

Inspect dynamic behavior in hot paths.

Look for:

* reflection
* type assertions
* interface boxing
* repeated interface conversions
* generic helpers creating allocations
* dynamic dispatch in extremely frequent operations

Determine whether any abstraction cost is material.

Do not remove good APIs for nanoseconds.

This is a shared base library: maintainability and API stability matter.

⸻

Agent G — Slice / Map Efficiency

Inspect hot data structures.

Look for:

* repeated slice growth
* missing capacity hints
* append patterns causing copies
* repeated map allocation
* maps where slices would suffice
* repeated full-map traversal
* unnecessary cloning

Search for known sizes that could allow:

make([]T, 0, expectedSize)

or similar.

Require benchmarks.

⸻

Agent H — Copies & Byte Flow

Follow one Kafka message byte-for-byte.

Produce a map like:

Kafka client buffer
→ library message
→ processor
→ retry
→ redrive
→ deadletter

Identify every:

* copy
* conversion
* decode
* encode
* serialization

Ask:

Are we copying immutable payloads unnecessarily?

Potential improvements may include:

* avoiding copies
* delaying decoding
* preserving encoded payloads
* sharing immutable metadata

But never violate ownership or lifecycle safety.

⸻

Agent I — Kafka Batching

Inspect Kafka interaction.

Ask:

Are we paying once per message for work that Kafka naturally supports per batch?

Review:

* fetch batching
* producer batching
* offset commits
* retries
* deadletter publishing
* redrive publishing
* acknowledgement paths
* metadata calls

Look for:

* commit-per-message
* publish-per-message
* tiny batches
* repeated Kafka requests

Estimate actual Kafka operation reduction.

⸻

Agent J — Retry & Degraded Mode

Treat failures as performance workloads.

Investigate:

* retry storms
* retry synchronization
* repeated processing
* repeated decode
* repeated downstream calls
* repeated logging
* deadletter amplification
* redrive amplification

Key principle:

A degraded dependency should usually cause the system to do less work, not dramatically more work.

Find opportunities for:

* smarter retry behavior
* backoff
* direct redrive
* load shedding
* failure classification
* circuit-style behavior

Do not change delivery semantics casually.

⸻

Agent K — Timers

Find:

* time.After
* time.NewTimer
* time.NewTicker
* retry timers
* timeout timers
* delayed work
* per-message deadlines

Look for:

* timer allocation
* timer churn
* thousands of sleeping goroutines
* synchronized wakeups
* forgotten Stop()
* repeated timer reset patterns

Benchmark before introducing timer pooling or scheduler complexity.

⸻

Agent L — Context Cost

Inspect context.Context usage.

Look for:

* repeated context.WithValue
* deep context chains
* unnecessary context construction per message
* repeated deadline wrapping
* context used as generic metadata storage

Preserve cancellation semantics.

Do not optimize context usage unless it is measurably significant.

⸻

Agent M — Logging & Metrics

Inspect per-message observability.

Look for:

* fmt.Sprintf before log-level check
* structured fields allocated unnecessarily
* log statements inside tight loops
* stack traces
* high-cardinality metric labels
* histogram updates
* duplicated metrics
* per-message timestamps

Preserve useful observability while reducing hot-path cost.

⸻

Agent N — Algorithms

Look for complexity problems.

Search for:

* O(n²)
* repeated sorting
* repeated scans
* queue removal from front of slices
* unnecessary map traversal
* repeated handler lookup
* repeated configuration search
* partition scans

Algorithmic changes usually outrank micro-optimizations.

⸻

Agent O — Compiler / Escape Specialist

Use Go compiler behavior to identify hidden costs.

Inspect:

* inlining
* escape behavior
* bounds-check elimination
* heap escapes
* closures
* pointer usage
* interfaces

Use compiler diagnostics to test hypotheses.

Avoid code contortions solely to satisfy compiler behavior unless the improvement is meaningful.

⸻

Agent P — Scheduler / Runtime Specialist

Use execution traces where relevant.

Investigate:

* scheduler latency
* runnable goroutine count
* excessive context switching
* GC assists
* syscall blocking
* network blocking
* channel blocking
* stop-the-world effects

Determine whether the runtime itself reveals architectural inefficiency.

⸻

Agent Q — API-Level Performance

Because this is a base library, investigate whether the API forces callers into inefficient usage.

Examples:

* per-message callback where batch callback would suffice
* API requires payload conversion
* API forces copying
* metadata recreated repeatedly
* caller cannot provide capacity hints
* caller cannot communicate known failure semantics
* library hides batching opportunities

The best optimization may be a small semantic API addition.

⸻

Agent R — Benchmark Skeptic

Challenge every finding.

For every candidate ask:

* Is this on a real hot path?
* How frequently does it execute?
* Is the benchmark realistic?
* Does the result survive benchstat?
* Does it improve end-to-end throughput?
* Does it improve tail latency?
* What happens under contention?
* Does it increase memory?
* Does it make the API worse?
* Does Kafka/network cost dwarf the improvement?
* Is the compiler already optimizing this?
* Does production workload actually hit this path?

Reject benchmark theatre.

⸻

7. Search Specifically for Per-Message Tax

Produce a dedicated inventory of operations executed once per Kafka message.

For each operation estimate:

cost/message × messages/sec

Look especially for:

* allocation
* formatting
* context creation
* map access
* lock acquisition
* channel send
* channel receive
* timer creation
* error wrapping
* metrics
* logging
* serialization
* payload copy

Then determine whether each could become:

* per-batch
* per-partition
* per-consumer
* cached
* lazy
* eliminated

This section is mandatory.

⸻

8. Candidate Format

Every candidate must use this structure.

Optimization: <short name>

Hot Path

Exact location.

Evidence

Files, functions, benchmark/profile data.

Current Behavior

What happens today?

Current Cost

Provide measurable evidence where possible.

Examples:

* 3 allocs/msg
* 480 B/msg
* 8% CPU
* 12% mutex wait
* 1 commit/msg

Root Cause

Why does the cost exist?

Proposed Change

Smallest reasonable optimization.

Why Base-Library Level

Explain why downstream services should not each solve this themselves.

Experiment

How to prove/disprove it.

Benchmark Workload

Define realistic workload.

Acceptance Criteria

Example:

At least 5% throughput improvement with no statistically significant p99 regression.

or:

Remove at least 1 allocation/message without increasing CPU or complexity materially.

Expected Gain

Conservative estimate.

Compatibility

Does this alter public API or semantics?

Complexity

XS / S / M / L

Risk

Low / Medium / High

Confidence

Low / Medium / High

⸻

9. Rank by Fleet-Level Value

Because this is a shared library, estimate two levels of impact:

Local improvement

Example:

2% CPU reduction per consumer

Fleet improvement

Example:

2% × hundreds of services using this library

Use:

Fleet Value ≈ frequency × local cost × improvement × adoption

Prefer optimizations automatically inherited by downstream consumers.

⸻

10. Candidate Buckets

Return:

Quick Wins

Strong evidence, low risk.

High-Leverage

Potentially large fleet-wide benefit.

Architectural Performance Opportunities

Require API or semantic changes but could remove substantial work.

Needs Benchmarking

Plausible hypotheses needing proof.

Rejected

Investigated and found unlikely to matter.

Include the rejected section explicitly.

⸻

11. Top 5

Rank the strongest candidates.

Candidate	Evidence	Local Gain	Fleet Value	Complexity	Risk	Confidence

Then identify:

Best First Experiment

Highest information gained for least effort.

Best Quick Win

Highest-confidence inexpensive change.

Highest Fleet Impact

Largest likely aggregate benefit across consumers.

Best Allocation Win

Most promising reduction in allocations/GC.

Best Architectural Win

Small API/semantic change capable of eliminating significant runtime work.

⸻

12. Guardrails

This is infrastructure used by many services.

Do not:

* rewrite the library
* change Kafka delivery guarantees accidentally
* break partition ordering
* sacrifice correctness
* introduce unsafe code casually
* leak internal Kafka implementation details through public APIs
* create surprising APIs
* introduce global state
* add sync.Pool reflexively
* replace clear code with cryptic micro-optimization
* add lock-free structures without proof
* optimize cold paths
* trust one microbenchmark
* claim victory from nanoseconds while ignoring network/system behavior

Preserve:

* API stability
* backward compatibility where possible
* cancellation
* shutdown semantics
* ordering
* delivery guarantees
* observability
* debuggability
* maintainability

⸻

13. Required Final Deliverable

Return:

1. Go runtime architecture map
2. Kafka data-path map
3. goroutine/channel topology
4. per-message tax inventory
5. allocation/escape findings
6. profiling results
7. specialist-agent findings
8. ranked optimization candidates
9. Top 5
10. rejected ideas
11. benchmark plans
12. recommended execution order

Do not implement production changes yet.

This phase is performance reconnaissance.

The desired output is not:

“Here are many ways Go code could theoretically be faster.”

The desired output is:

“Here are the few places where a small change in this shared Go Kafka library could measurably improve performance across the entire fleet.”
