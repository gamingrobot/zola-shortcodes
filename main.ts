import { Plugin, editorLivePreviewField, editorInfoField } from 'obsidian';
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
		return element;
	}
	ignoreEvent(event: Event): boolean {
		return false;
	}
}

class CalloutWidget extends WidgetType {
	readonly type: string;
	readonly text: string;
	constructor(type: string, text: string) {
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
		const calloutTitle = callout.createEl('div');
		calloutTitle.setAttr('class', 'callout-title')
		const calloutTitleInner = calloutTitle.createEl('div');
		calloutTitleInner.setAttr('class', 'callout-title-inner')
		calloutTitleInner.innerHTML = this.type
		const content = callout.createEl('div');
		content.setAttr('class', 'callout-content');
		content.innerHTML = this.text;
		return callout;
	}
}

const tagRegex = /{{\s*(img|video)\(src="([\/\.\w-]+)".*}}/g;
const calloutStartRegex = /^{%\s*(info|tip|warning|danger)\(\)\s*%}$/g
const calloutEndRegex = /^{%\s*end\s*%}$/g

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
				const doc = transaction.state.doc;
				const from = 0;
				const to = transaction.state.doc.length;
				let insideCallout = false;
				let calloutType = "";
				let calloutText = "";
				let calloutFrom = 0;
				for (let cursor = doc.iterRange(from, to), pos = from, m; !cursor.next().done; pos += cursor.value.length) {
					if (!cursor.lineBreak) {
						if(cursor.value[0] != '{') { //not a shortcode line
							if(insideCallout)
							{
								calloutText += cursor.value;
							}
							continue;
						}
						//console.log(cursor.value);
						//tag
						while(m = tagRegex.exec(cursor.value)){
							const tag = m[1];
							const name = m[2];
							if (editorInfo.file) {
								const file = plugin.app.metadataCache.getFirstLinkpathDest(name, editorInfo.file.path);
								if (file) {
									const path = plugin.app.vault.getResourcePath(file) + '?' + file.stat.mtime;
									builder.add(pos + m.index, pos + m.index + m[0].length, Decoration.replace({ widget: new TagWidget(tag, path, file.path) }))
								}
							}
						}
						//callout start
						while(m = calloutStartRegex.exec(cursor.value)){
							insideCallout = true;
							calloutType = m[1];
							calloutFrom = pos + m.index;
						}
						//callout end
						while(m = calloutEndRegex.exec(cursor.value)){
							if(insideCallout){
								builder.add(calloutFrom, pos + m.index + m[0].length, Decoration.replace({ widget: new CalloutWidget(calloutType, calloutText) }))
								insideCallout = false;
								calloutType = "";
								calloutText = "";
								calloutFrom = 0;
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