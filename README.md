# Web UI for Rust Unsafety Propogation Graph

This is a visual tool for safety tag analysis.

## Features

### Render safety tags in a direct call graph

Achieving a complete soundness guarantee requires the analysis of both endogenous and
exogenous functions.

For endogenous soundness, safety tags should be correctly discharged at the call site,
delegated upward, or transformed into new tags associated with the caller.

While tag checking and enforcement are executed by the `safety-tool` linter, the UI
simply attaches tags as child nodes to the function-level nodes.

![](https://github.com/user-attachments/assets/e8e41752-e147-4bd0-8de9-f3bceb5c4e19)

The side panels juxtapose tag-derived safety documentation with the original safety
section, allowing for easier reconciliation.

### Explore tag specifications and usage frequencies

A dedicated toolbar button opens a global registry of all tag specifications. Users can
explore tag arguments, types, and their associated functions. The interface also includes
a bar chart illustrating usage statistics for each tag.

![](https://github.com/user-attachments/assets/6794a20f-e0a9-42b3-952e-4c29cf263470)

<details>

<summary>The search interface renders tags as badges adjacent to the function name.</summary>

![](https://github.com/user-attachments/assets/f247945f-0806-42dd-987a-6148f2412a27)

![](https://github.com/user-attachments/assets/4cf9956f-bdbf-4a62-a3aa-c7d7bdb4737b)

</details>

### Inspect exogenous functions for ADTs in a popup view

Exogenous functions are defined as functions that, while not directly invoked, may
compromise the caller's invariants within the local or downstream crates upon composition.

Our analysis focuses on functions associated with ADTs, specifically those where the ADT
serves as the receiver type of the current method (the caller). This scope encompasses not
only constructors but also functions that manipulate the ADT’s state through direct field
access, arguments, or local variables.

![](https://github.com/user-attachments/assets/d14ba2cd-fec0-4663-8c3c-0ae10992c1c3)

![](https://github.com/user-attachments/assets/b7253f2a-7fd3-43bf-96d3-0900d3c7283c)

### Streamline auditing in side panels

**Side panels** streamline the audit process by providing centralized access to critical
analysis materials, allowing users to switch contexts effortlessly. The panel view
consists of:
*   **ADT Exogenous Functions**: Provides a condensed equivalent of the ADT popup's
interface. Users can trigger specialized popups through the following buttons:
    *   **Constructors**: Lists functions that return the ADT.
    *   **Fields**: Displays functions that access ADT fields, categorized by
    **read** and **write** operations.
    *   **Arguments**: Identifies functions where the ADT is passed as an argument,
    separating **read** and **write** access.
    *   **Locals**: Shows functions where the ADT is used as a local variable, categorized
    by **read/write** access.
*   **Safety Properties**: Renders detailed safety documentation for tagged functions,
derived from both tag usage and specifications.
*   **Documentation**: Displays a richly rendered HTML view derived from Markdown
docstrings.
*   **Source Code**: Provides a full-view display of the function's source code.
*   **MIR**: Displays the MIR for a function instance.

![](https://github.com/user-attachments/assets/bc038c70-f1a6-4e1d-b8aa-d8ae158380b5)

## Explanations

### Start an unsafe function

The interface offers multiple ways to locate or navigate to specific functions:
* Global Search: Click the search icon in the top bar to access a complete list of
functions. You can refine the results by filtering for function names or specific tags.
* Module Navigation: Click the navigation icon to toggle the left sidebar. This displays a
module-based tree view, where you can browse and select functions within expanded modules.
* Safety Tag Association: Click the tag icon to view the tag specifications and choose a 
function the interested tag is annotated on.
* Quick Start: The tool automatically displays a default unsafe function when you switch
between crates. Current supported crates are core, alloc, std, and ostd (AsterinasOS).

### Tag-derived documentation

To ensure reusability, tags are designed as templates for backfilling specific variables.
However, our present annotations in the standard library consists only of tag names
without arguments, resulting in generic and incomplete documentation. You'll find more
readable tag-derived output in the ostd crate, as it utilizes full arguments.

This difference stems from the standard library's audit predating the creation of
safety-tool, leading to its reliance on JSON manipulation, while AsterinasOS was audited
using attribute syntax and the linter.

## Build the project

Commands to build the UI project:

```bash
cd ui
# Install dependencies
npm install
# Generate static webpage artifacts
npm run generate
# Start the development server on `http://localhost:3000`:
npm run dev
```

To collect the data, we implemented a custom rustc driver and a cargo wrapper that extract
API information, such as call graphs and ADT-related functions, into JSON format. The
safety tags are sourced from the `tag-std` project.

The application is a fully static webpage that fetches data hosted in a GitHub repository.
