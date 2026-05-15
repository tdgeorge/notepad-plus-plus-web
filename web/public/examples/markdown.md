# Markdown Kitchen Sink: The Ultimate Preview Test
This document is designed to test the rendering capabilities of Markdown previewers. It includes every standard feature and several common extensions.

---

## 1. Headers
# Heading level 1
## Heading level 2
### Heading level 3
#### Heading level 4
##### Heading level 5
###### Heading level 6

---

## 2. Text Styling
- **Bold text** with double asterisks or __underscores__.
- *Italicized text* with single asterisks or _underscores_.
- ***Bold and Italicized*** with triple asterisks.
- ~~Strikethrough~~ using double tildes.
- Highlighting is often done with ==double equals== (extension).
- Super<sup>script</sup> and Sub<sub>script</sub> (extension).

---

## 3. Lists

### Unordered List
* Item 1
* Item 2
  * Sub-item 2.1
  * Sub-item 2.2
    * Deeply nested item
* Item 3

### Ordered List
1. First item
2. Second item
   1. Sub-item A
   2. Sub-item B
3. Third item

### Task List
- [x] Completed task
- [ ] Incomplete task
- [ ] Task with *formatting*

---

## 4. Blockquotes
> This is a standard blockquote.
>
>> This is a nested blockquote.
>
> "The best way to predict the future is to invent it." — Alan Kay

---

## 5. Code

### Inline Code
You can use `inline code` to highlight `variable_names` or `functions()`.

### Code Blocks (Syntax Highlighting)
```python
def hello_world():
    # This is a comment
    message = "Hello, Markdown!"
    print(message)
    return True
```

```javascript
const greet = (name) => {
  console.log(`Hello, ${name}!`);
};
```

---

## 6. Tables

| Feature | Support | Performance | Notes |
| :--- | :---: | :---: | :--- |
| **Headers** | High | Fast | Essential for navigation |
| **Tables** | Medium | Normal | Needs alignment checks |
| **Math** | Low | Slow | Often requires plugins |
| **Images** | High | Varies | Check alt text rendering |

---

## 7. Links and Media

### Links
* [Google](https://www.google.com) - Automatic title-less link.
* [Markdown Guide](https://www.markdownguide.org "Visit the Guide") - Link with a hover title.
* Internal Reference: [Jump to Tables](#6-tables)

### Images
![Markdown Logo](https://upload.wikimedia.org/wikipedia/commons/4/48/Markdown-mark.svg)
*Caption: The official Markdown logo.*

---

## 8. Mathematical Expressions (LaTeX)
*Note: Requires MathJax or KaTeX support.*

Inline: $E = mc^2$

Block:
$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$

---

## 9. Footnotes
Here's a simple footnote,[^1] and here's a longer one.[^bignote]

[^1]: This is the first footnote.
[^bignote]: Footnotes can contain multiple lines, code, and lists.

---

## 10. Definition Lists (Extension)
Term 1
: Definition 1

Term 2
: Definition 2a
: Definition 2b

---

## 11. HTML Elements
<details>
  <summary>Click to expand a details tag</summary>
  <p>Inside, you can use <b>HTML</b> or <i>Markdown</i>.</p>
</details>

<br>

<div align="center">
  <h3>Centered Content via HTML</h3>
  <p>Some previewers allow raw HTML for layout control.</p>
</div>

---

## 12. Horizontal Rules
Three or more...

Asterisks:
***

Dashes:
---

Underscores:
___

---

## 13. Admonitions / Callouts (Extension)
> [!NOTE]
> This is a note callout (GitHub/Obsidian style).

> [!WARNING]
> Use caution when testing obscure extensions.

---

**End of Test File**
