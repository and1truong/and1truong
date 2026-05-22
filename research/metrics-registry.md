Sir, this is a solid architecture instinct. Let me push on each unknown with concrete approaches.

1. Discovering related services

You need multiple signals, ranked by reliability:

Strong signals (use first):

	•	Service mesh topology (Istio/Linkerd traces, or your existing Tempo data) — services that call each other share metric patterns. Extract the call graph from spans.
	•	Ownership metadata — team, repo org, k8s namespace, labels. Cheapest signal, surprisingly effective.
	•	Deployment manifests — services using same base image, same Helm chart, same framework version almost always emit similar metrics.

Medium signals:

	•	Runtime/language fingerprint — Go services expose go_* metrics, JVM services expose jvm_*, etc. Group by runtime first.
	•	Library fingerprint — if two services both import sarama (Kafka client), they’ll both have Kafka consumer lag metrics. Parse go.mod/package.json/pom.xml.

Weak signals (use for tiebreaking):

	•	Metric name embeddings — embed existing metric names per service, cosine similarity between services. Catches “these two services both track HTTP + DB + cache” without you encoding that.

At 1000 services, build this as a graph: nodes = services, edges = weighted similarity from each signal. Then “related services” = top-k neighbors. Don’t try to be clever with one signal; combine them.

2. How current metrics influence next-metric exploration

This is a classic exploration problem. Frame it as hypothesis-driven expansion (you’ve done this with your RCA work — same mental model):

Step 1: Classify what you already have. Bucket discovered metrics into categories — RED (rate/error/duration), USE (utilization/saturation/errors), runtime, business. A service with only http_requests_total is missing latency and errors — high-VoI to look for those next.

Step 2: Templates from peers. If 8/10 peer services have kafka_consumer_lag_* and this service doesn’t, that’s a strong “go look” signal. Compute peer-coverage delta.

Step 3: Prefix/namespace expansion. Metric names are hierarchical. If you found db_query_duration_seconds, probe for db_query_errors_total, db_connection_pool_*. Prometheus /api/v1/label/__name__/values is cheap — pull all names, filter by learned prefixes.

Step 4: Score and rank. For each candidate metric to verify:

score = peer_coverage * w1 + category_gap * w2 + prefix_locality * w3 - exploration_cost * w4


Pick top-N per iteration. This is essentially MCTS-lite — same shape as your RCA hypothesis tree.

3. Learning from manual input / feedback

Three feedback types, handle separately:

Type A — Explicit metric registration. User says “this service’s SLI is checkout_success_rate.” Store as ground truth, weight = 1.0. This becomes a labeled example for the peer-learning step: now any service related to this one gets checkout_success_rate as a high-priority candidate.

Type B — Accept/reject on agent suggestions. Agent proposes “I think redis_commands_duration_seconds is important here.” User clicks ✓ or ✗. Store as (service, metric, label, confidence). Use these to:

	•	Retrain the ranking weights (w1..w4 above) — simple logistic regression on accept/reject is enough, don’t over-engineer.
	•	Build a per-team “metric vocabulary” — team A consistently rejects JVM internals, team B always accepts them.

Type C — Implicit signals. Which metrics actually got used in generated runbooks? Which runbooks did on-call engineers find useful (thumbs up, time-to-resolution)? This is the strongest signal but slowest to accumulate. Log it from day one even if you don’t use it yet.

Critical design choice: store feedback at two levels — (service, metric) and (service_cluster, metric_pattern). The cluster-level generalizes; the service-level overrides. Without this you’ll either overfit (one team’s preferences pollute everyone) or never personalize.

Scale considerations (1000 services × hundreds of metrics)

A few things that bite at this scale:

	•	Don’t store metric values in the registry. Store metric identity — name, type, labels, unit, semantic category, source service, confidence. Values stay in Prometheus/Tempo. Registry stays small (~MB, not TB).
	•	Incremental discovery. Don’t re-scan all services on every run. Watch for new deploys (k8s events) and changed /metrics endpoints (hash the output). Most services are stable week-to-week.
	•	Embeddings cache. Embedding all metric names for 1000 services is ~100k embeddings — fine. Cache aggressively, invalidate on metric-set hash change.
	•	Two-tier agent. A cheap classifier (rules + small model) handles 80% of obvious cases. Expensive LLM agent only runs on the ambiguous 20% and on user feedback events. Otherwise your token bill is brutal.

Suggested data model

services: id, name, team, namespace, runtime, libs[], deploy_hash
service_edges: src, dst, signal_type, weight
metrics: service_id, name, type, labels, unit, category, confidence, source (auto|manual|feedback)
feedback: service_id, metric_name, user_id, action (accept|reject|register), timestamp
runbook_uses: runbook_id, metric_name, useful (bool|null)


The confidence + source fields are what let the runbook generator know “this metric is human-verified vs guessed” — your runbook quality should degrade gracefully based on this.

One thing worth flagging: the hardest part won’t be discovery, it’ll be keeping the registry honest as services evolve. Metrics get renamed, deprecated, added. Build the staleness detection (last-seen timestamp, drift alerts) into v1 or you’ll be debugging “why does the runbook reference a metric that doesn’t exist anymore” forever.

Want me to go deeper on any of these — the peer-similarity graph, the ranking function, or the feedback loop architecture?

---

Sir, glad that landed. Let me deep-dive section 3, then hit the literature search.

Deep dive: learning from feedback

The core problem

You’re building a system where:

	•	The agent makes predictions (suggested metrics per service)
	•	Humans give sparse, noisy, biased feedback
	•	The system must improve over time without catastrophically forgetting or overfitting to one loud team

This is human-in-the-loop learning with delayed, multi-source signals. Three sub-problems worth separating:

Sub-problem A: Feedback collection — what to actually capture

Most systems screw this up by collecting too little or too much. Minimum viable schema:

feedback_event {
  id, timestamp, user_id, team_id
  service_id
  metric_identity (name + labels hash)
  action: register | accept | reject | edit | unregister
  context: suggested_by_agent_run_id | manual
  rationale: optional free text
  confidence_before, confidence_after
}


Two non-obvious fields worth fighting for:

rationale (free text). Even if 90% is empty, the 10% that’s filled is gold — “rejected because this is a debug metric not an SLI” teaches your system a rule, not just a label. Run an LLM over these periodically to extract patterns.

context. You need to know what the agent suggested at the moment of feedback to do counterfactual learning later. Without this, you can’t tell if the user rejected your suggestion or rejected a metric they discovered themselves.

Sub-problem B: Aggregation — turning events into beliefs

A single ✗ click doesn’t mean “this metric is bad.” You need a belief model. I’d go Bayesian here, not because it’s fancy, but because confidence intervals matter when downstream systems (runbook generator) consume this:

For each (service, metric) pair, track:

relevance ~ Beta(α, β)
  α = 1 + accepts + 2*registrations  
  β = 1 + rejects + 0.5*ignores


This gives you a posterior on “is this metric relevant for this service” with natural confidence bounds. New pairs start at Beta(1,1) — uniform prior. After 5 accepts and 1 reject, you have a tight peak near 0.83. After 1 accept and 0 rejects, you have a wide distribution centered at 0.67 — use it but flag low confidence.

Why this matters: your runbook generator can query “give me metrics with P(relevant) > 0.7 AND CI width < 0.2” and skip the speculative ones.

Sub-problem C: Generalization — the hard part

Per-service feedback is sparse. 1000 services × 100 metrics = 100k cells, you’ll have feedback on <1%. You must generalize across services. Three layers, in order of how aggressive the generalization is:

Layer 1: Pattern-level feedback. When a user rejects jvm_gc_collection_seconds_count, store it not just at the metric-name level but at multiple abstraction levels:

	•	exact: jvm_gc_collection_seconds_count
	•	prefix: jvm_gc_*
	•	category: runtime.gc.*
	•	semantic: “low-level GC internals”

When scoring a new metric for a new service, check all four levels. Weight closer matches higher. This is essentially hierarchical Bayesian smoothing — borrow strength from related observations.

Layer 2: Team-level priors. Team A consistently rejects runtime internals. Encode this as a team-level multiplier on category scores:

score(metric, service) = base_score * team_prior(metric.category, service.team)


Update team priors via simple online gradient: every feedback event nudges the team’s category weights. EWMA with half-life of ~30 days works fine; don’t overthink it.

Layer 3: Cross-team transfer via service similarity. This is where your similarity graph from section 1 pays off again. If service S has no feedback but its top-5 peers all marked kafka_consumer_lag_* as critical, propagate that belief with a discount factor:

inferred_belief(S, m) = Σ w(S, peer) * belief(peer, m) for peer in top_k(S)


where w is the edge weight, normalized. This is label propagation on a graph — well-studied, cheap to compute, works.

Three layers compose multiplicatively. Each layer can be turned off for ablation.

Sub-problem D: The retraining loop

Don’t retrain a giant model nightly. Stratify by update cost:



|Component               |Update frequency  |Mechanism                           |
|------------------------|------------------|------------------------------------|
|Per-pair Beta posterior |Real-time on event|Closed-form update                  |
|Team category priors    |Hourly batch      |EWMA over events                    |
|Pattern-rule extraction |Daily batch       |LLM over rationale text             |
|Ranking weights (w1..w4)|Weekly            |Logistic regression on accept/reject|
|Embedding model         |Quarterly or never|Off-the-shelf is fine               |

The discipline: anything updated more often than daily must be closed-form or near-closed-form. No model training in the hot path.

Sub-problem E: Avoiding the failure modes

These will bite you, plan for them:

Feedback bias. Senior engineers give more feedback. Their preferences dominate. Mitigate by tracking per-user feedback volume and down-weighting hyperactive users with diminishing returns (log scale).

Concept drift. A metric that was critical last quarter becomes deprecated. Solve with time-decay on the Beta posterior — multiply α and β by 0.95 monthly. Old feedback fades, recent feedback dominates. (This is why I’d avoid plain counts.)

Cold start for new services. No feedback, no peers with feedback. Fall back to category-level team priors + the registry’s default category scores. Mark all suggestions as low-confidence until first feedback arrives.

Adversarial / lazy feedback. Someone rejects everything to make the popup go away. Detect: users whose accept rate is wildly different from team average. Don’t ban them, just down-weight.

Feedback starvation. Most services get no feedback ever. Active learning: occasionally surface “uncertain” suggestions (high CI width on the Beta posterior) to the user instead of just confident ones. Costs UX, buys learning signal. Tunable.

A pragmatic v1 architecture

If I were building this Monday morning, I’d ship:

	1.	Event log (append-only, partition by service_id)
	2.	Beta posterior table updated streaming
	3.	Team category priors table updated hourly
	4.	Label propagation job nightly over the similarity graph
	5.	Single scoring service that combines all three for queries
	6.	No ML model training in v1 — pure Bayesian + graph + rules

You can add learned components (gradient-boosted ranker, embedding fine-tuning) when you have >10k feedback events. Below that volume, simple methods beat fancy ones — bias-variance tradeoff is unforgiving with sparse data.

On the literature

You’re right that it’s not a special problem — it’s a remix of several well-studied ones. Let me search for the most relevant threads.

Hit gold on result 5 — that’s exactly your problem space. Let me pull that one and search for the feedback-learning side.

One more targeted search — your problem is also fundamentally a recommender system with cold start.

Good signal. Here’s the synthesis:

Literature mapping for your problem

Your problem isn’t novel — it sits at the intersection of three well-studied fields. Treat them as a toolbox:

1. Metric criticality in microservices (closest match)

The most directly relevant paper I found is “Metric Criticality Identification for Cloud Microservices” (arXiv 2501.03547) ￼, which addresses exactly your framing: defining alerts on observability metrics requires manual subject matter expertise, which becomes infeasible with thousands of metrics — they note that overly conservative strategies create false positives while limited alert sets miss critical events, and most automated techniques in literature focus on monolithic applications rather than microservices ￼. Read this one first — it’s literally your problem statement.

The Eadro framework mentioned in result 3 is also worth tracking down — it does anomaly detection + root cause localization across multi-source telemetry, which overlaps with metric selection.

2. Human-in-the-loop / RLHF and active learning

Your feedback-learning loop maps to active learning with sparse oracle calls. The Kaufmann et al. RLHF survey (arXiv 2312.14925) is the canonical reference — note especially that n-ary feedback like rankings provides more information than binary feedback but puts higher cognitive burden on labelers, and passive feedback often cannot match the information density of active feedback, so it’s common to combine both — initialize from active feedback then refine from passive ￼. That’s directly relevant to your accept/reject UX design.

For when-to-ask logic, SPARQ proposes a progress-aware query policy that requests feedback only when learning stagnates or worsens, achieving near-perfect success with about half the feedback budget of always-querying baselines ￼. Same idea applies to your system: don’t bug users on every suggestion, only when confidence is low or stagnating.

3. Recommender systems with cold start + implicit feedback

This is the most underrated framing — your problem is structurally identical to “recommend metrics to a service given sparse feedback and side information.” The literature here is mature. Combining Probabilistic Matrix Factorization with Bayesian Personalized Ranking lets you use both explicit and implicit feedback together, specifically addressing extreme sparse data cases ￼. Map: users → services, items → metrics, ratings → accept/reject signals.

For your cold-start case (new service with no feedback), item popularity models are simple, efficient, and particularly useful when little is known about user preferences — often used to overcome cold-start ￼. Translation: when a new service arrives, just rank by “what metrics are popular in similar services” — exactly what you proposed in section 1.

Keywords for further reading

When you go deeper, search for:

	•	“metric selection observability” + “AIOps”
	•	“Bayesian Personalized Ranking implicit feedback”
	•	“label propagation graph semi-supervised”
	•	“preference learning sparse feedback”
	•	“service dependency graph SRE”
	•	“alert tuning machine learning” (overlapping problem space)
	•	“concept drift online learning” (for your time-decay needs)

My honest take

You don’t need new research. You need to:

	1.	Steal the PMF + BPR hybrid from result 17 as your math backbone for the relevance model.
	2.	Steal SPARQ-style stagnation-triggered querying from result 13 for when to ask users.
	3.	Steal label propagation on the service similarity graph from semi-supervised learning textbooks for cross-service generalization.
	4.	Read the Metric Criticality paper to make sure you’re not missing an obvious technique someone already validated for this exact domain.

Your problem is “common” in the sense that all the building blocks exist. The novelty is in the specific combination and the operational engineering at 1000-service scale — which is exactly what your day job is anyway.

Want me to deep-dive any of these papers, or pivot to the operational side (eventing pipeline, store design, query API)?
