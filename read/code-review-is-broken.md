Hi team,

I’d like to organise a discussion about our current code review process.

With the amount of AI-generated code increasing, I don’t think the traditional approach of opening a PR and reviewing the diff line-by-line is scaling anymore. Large PRs now require significant effort just to reconstruct the intent, architecture, and important changes before the actual review can even begin.

A few things worth thinking about before the discussion:

* Should PR authors provide more visual/contextual information upfront — architecture, flow, important changes, risk areas?
* Can we make it much clearer which parts actually require human attention?
* Should we have tooling that produces a concise “review pack” or semantic summary before a PR reaches reviewers?
* How do we avoid every reviewer having to run their own coding agent just to understand someone else’s generated code?
* What should “ready for review” mean in an AI-heavy development workflow?

I’m not proposing a specific solution yet. I think the bigger point is that our current review model is becoming too expensive in reviewer time and cognitive load, and we should rethink it.

Thanks,
