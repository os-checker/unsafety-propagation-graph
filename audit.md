
# Auditing Code with the UI Tool

We've built a visualization tool for safety tag analysis, deployed as a fully static
webpage at <https://unsafety-propagation-graph.vercel.app>.

The tool aids human review of safety tags and unsafe code through visualization, by
orchestrating necessary audit information.

Tag checking and enforcement are implemented by the `#[safety::<predicate>(...)]`
attributes and `safety-tool` linter, so they fall outside the current UI's purview.

We use the unsafe `Vec::set_len` function from the `alloc` crate as the default example.
In this view, `InBound` and `ValidNum` tags are displayed within the caller function node,
while their definitions are rendered in the Safety Property panel.

The graph interface streamlines the representation of UPG edges, presenting only two
categories:
* Caller-to-callee edges: Callee nodes are situated to the right of the caller nodes, and
unsafe functions are visually marked with a red background.
* Caller-to-field edges: Each is labeled to specify the access type as either read or
write.

The graph interface significantly simplifies the UPG edges. Only two kinds of edge are
presented:
* on the caller-to-callee edge, the caller node starts to the right to the callees; unsafe
  functions are  in red background
* caller-to-field edges are labelled with access way

The call graph features the following node interactions:
* A click on a function node updates the side panels to show its tag-derived
documentation, original documentation, source code, and MIR.
  * Specifically, when a function node is selcted, the name will be rendered as a
  hyperlink in the documentation panel, allowing you to drill down and audit that specific
  unit in greater detail.
* A click on an ADT or field node opens a window for navigating between functions
identified as compromising exogenous soundness in our paper.
  * Our analysis focuses on functions associated with ADTs, specifically those where the
  ADT serves as the receiver type of the current method (the caller). This scope
  encompasses not only constructors but also functions that manipulate the ADT’s state
  through direct field access, arguments, or local variables.

![](https://github.com/user-attachments/assets/d14ba2cd-fec0-4663-8c3c-0ae10992c1c3)

![](https://github.com/user-attachments/assets/b7253f2a-7fd3-43bf-96d3-0900d3c7283c)

The top bar includes a help button that displays the README content and offers a feature
overview.
