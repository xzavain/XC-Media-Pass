// Custom Quill blots for BookStack-style callout boxes and collapsible sections.
//
// CalloutBlot  — <p class="callout info|success|warning|danger">editable text</p>
//   Extends Block so the text inside remains fully editable in the WYSIWYG view.
//
// CollapsibleBlot — <details><summary>Title</summary><p>content</p></details>
//   Extends BlockEmbed (atomic block) because Quill's Block blot cannot nest
//   other block-level elements. The content is preserved and rendered correctly
//   on the frontend; in the editor it appears as a styled, non-editable block
//   that can be deleted and re-inserted or edited via the HTML/Markdown view.
//
// Importing this module registers the blots with Quill's global registry.
// Must be imported before any ReactQuill instance mounts.

import { Quill } from "react-quill";

const Block = Quill.import("blots/block");
const BlockEmbed = Quill.import("blots/block/embed");

const CALLOUT_TYPES = ["info", "success", "warning", "danger"];

// --- Callout blot ---
class CalloutBlot extends Block {
  static create(value) {
    const node = super.create();
    node.classList.add("callout");
    if (value && CALLOUT_TYPES.includes(value)) {
      node.classList.add(value);
    } else {
      node.classList.add("info");
    }
    return node;
  }

  static formats(node) {
    const classes = Array.from(node.classList || []);
    return classes.find((c) => CALLOUT_TYPES.includes(c)) || "info";
  }
}
CalloutBlot.blotName = "callout";
CalloutBlot.tagName = "p";
CalloutBlot.className = "callout";

// --- Collapsible blot ---
class CollapsibleBlot extends BlockEmbed {
  static create(value) {
    const node = super.create();
    const summary = document.createElement("summary");
    summary.innerHTML = value?.summary || "Click to expand";
    node.appendChild(summary);

    const temp = document.createElement("div");
    temp.innerHTML = value?.content || "<p>Enter hidden content here...</p>";
    while (temp.firstChild) {
      node.appendChild(temp.firstChild);
    }
    return node;
  }

  static value(node) {
    const summary = node.querySelector("summary");
    const content = document.createElement("div");
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === 1 && child.tagName !== "SUMMARY") {
        content.appendChild(child.cloneNode(true));
      } else if (child.nodeType === 3 && child.textContent.trim()) {
        content.appendChild(child.cloneNode(true));
      }
    });
    return {
      summary: summary?.innerHTML || "",
      content: content.innerHTML || "",
    };
  }
}
CollapsibleBlot.blotName = "collapsible";
CollapsibleBlot.tagName = "details";

Quill.register(CalloutBlot, true);
Quill.register(CollapsibleBlot, true);