Hi team,

I’d like to organise a discussion about our code review process.

I think the current model is effectively broken for the amount of AI-generated code we are producing. Reviewing large diffs line-by-line is becoming too expensive, and reviewers are spending too much time reconstructing intent and architecture before the real review even starts.

A few things to think about:

* What context should PR authors be required to provide upfront?
* Should architecture/flow be made visible before reviewers open the diff?
* Can we clearly identify the small part of a PR that actually needs human judgment?
* Can tooling generate a concise review summary or “review pack”?
* How do we avoid reviewers needing their own coding agent just to understand a PR?

I don’t want to prescribe the solution yet, but I do think we need to redesign the process rather than keep optimising the old one.
