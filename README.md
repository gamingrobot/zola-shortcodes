# Zola Shortcodes for Obsidian

This plugin makes zola shortcodes render in Live Preview, switch to Source Mode to edit the shortcodes.
(These are specific shortcodes I made but I wanted to put up the code for other people to modify)

## Tags
- Renders `{{ img(src="name", ...) }}` as `<img src="name">`
- Renders `{{ video(src="name", ...) }}` as `<video controls preload="metadata" src="name">`

## Callouts 
```
{% callout(t="info") %}
Callout Text
{% end %} 
```
Renders as a obsidian callout (works for info, tip, warning, danger)
