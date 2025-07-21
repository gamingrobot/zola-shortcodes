import { Plugin, MarkdownRenderer, Component, editorLivePreviewField, editorInfoField } from 'obsidian';
import {
	Extension,
	RangeSetBuilder,
	StateField,
	Transaction,
	EditorState,
} from '@codemirror/state';
import {
	Decoration,
	DecorationSet,
	EditorView,
	WidgetType} from '@codemirror/view';

// <img src="image.webp">
class TagWidget extends WidgetType {
	readonly tag: string;
	readonly src: string;
	readonly filePath: string;
	constructor(tag: string, src: string, filePath: string) {
		super();
		this.tag = tag;
		this.src = src;
		this.filePath = filePath;
	}
	eq(widget: TagWidget) {
		return widget.src === this.src && widget.filePath === this.filePath;
	}
	toDOM(view: EditorView): HTMLElement {
		const element = document.createElement(this.tag);
		element.setAttr('src', this.src)
		element.setAttr('data-path', this.filePath);
		if(this.tag == "video"){
			element.setAttr('controls', "");
			element.setAttr('preload', "metadata");
		}
		return element;
	}
	ignoreEvent(event: Event): boolean {
		return false;
	}
}

class CalloutWidget extends WidgetType {
	readonly type: string;
	readonly text: HTMLElement;
	constructor(type: string, text: HTMLElement) {
		super();
		this.type = type;
		this.text = text;
	}
	eq(widget: CalloutWidget) {
		return widget.type === this.type && widget.text === this.text;
	}
	toDOM(view: EditorView): HTMLElement {
		const callout = document.createElement('div');
		callout.setAttr('class', 'callout')
		callout.setAttr('data-callout', this.type);
		this.text.setAttr('class', 'callout-content');
		callout.appendChild(this.text)
		return callout;
	}
	ignoreEvent(event: Event): boolean {
		return false;
	}
}

const tagRegex = /{{\s*(img|video)\(src="([\/\.\w-]+)".*}}/g;
const calloutRegex = /^{%\s*(info|tip|warning|danger)\(\)\s*%}(.*){%\s*end\s*%}$/g

function createStateField(plugin: ShortCodePlugin): StateField<DecorationSet> {
	return StateField.define<DecorationSet>({
		create(state: EditorState): DecorationSet {
			return Decoration.none;
		},
		update(oldState: DecorationSet, transaction: Transaction): DecorationSet {
			const builder = new RangeSetBuilder<Decoration>();
			const livePreview = transaction.state.field(editorLivePreviewField)
			if (livePreview) {
				const editorInfo = transaction.state.field(editorInfoField);
				const selection = transaction.state.selection.main;
				const doc = transaction.state.doc;
				const from = 0;
				const to = transaction.state.doc.length;
				for (let cursor = doc.iterRange(from, to), pos = from, m; !cursor.next().done; pos += cursor.value.length) {
					// console.log(pos);
					// console.log(cursor.value);
					if (!cursor.lineBreak) {
						if(cursor.value[0] != '{') { //not a shortcode line
							continue;
						}
						//tag
						while(m = tagRegex.exec(cursor.value)){
							const tag = m[1];
							const name = m[2];
							const tagFrom = pos + m.index;
							const tagTo = pos + m.index + m[0].length;
								if (editorInfo.file) {
									const file = plugin.app.metadataCache.getFirstLinkpathDest(name, editorInfo.file.path);
									if (file) {
										const path = plugin.app.vault.getResourcePath(file) + '?' + file.stat.mtime;
										if (selection.from < tagFrom || selection.to > tagTo) { //not selected
											builder.add(tagFrom, tagTo, Decoration.replace({ widget: new TagWidget(tag, path, file.path) }))
										}
										else {
											builder.add(tagTo, tagTo, Decoration.widget({ widget: new TagWidget(tag, path, file.path) }))
										}
									}
							}
						}
						while(m = calloutRegex.exec(cursor.value)){
							const type = m[1];
							const text = m[2];
							const calloutFrom = pos + m.index;
							const calloutTo = pos + m.index + m[0].length;
							if (selection.from < calloutFrom || selection.to > calloutTo) { //not selected
								var content = document.createElement('span')
								MarkdownRenderer.render(
									this.app,
									text,
									content,
									editorInfo.file?.path ?? "",
									new Component(),
								);
								builder.add(calloutFrom, calloutTo, Decoration.replace({ widget: new CalloutWidget(type, content)}))
							}
						}
					}
				}
			}

			return builder.finish();
		},
		provide(field: StateField<DecorationSet>): Extension {
			return EditorView.decorations.from(field);
		},
	});
}

export default class ShortCodePlugin extends Plugin {
	async onload() {
		this.registerEditorExtension(createStateField(this));
	}

	onunload() {

	}
}