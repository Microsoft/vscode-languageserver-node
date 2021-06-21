/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, commands, Disposable, DocumentSelector, languages, Location, Position, TextDocument, workspace } from 'vscode';
import { TypeHierarchyItem, TypeHierarchyProvider } from './typeHierarchy.api';

/**
 * Register a type hierarchy provider.
 *
 * @param selector A selector that defines the documents this provider is applicable to.
 * @param provider A type hierarchy provider.
 * @return A [disposable](#Disposable) that unregisters this provider when being disposed.
 */
export function registerTypeHierarchyProvider(selector: DocumentSelector, provider: TypeHierarchyProvider): Disposable {
	TypeHierarchyProviderRegistry.register(selector, provider);
	return new Disposable(() => {
		// dispose
	});
}

export class TypeHierarchyModel {
	static async create(document: TextDocument, position: Position, token: CancellationToken): Promise<TypeHierarchyModel | undefined> {
		const [provider] = TypeHierarchyProviderRegistry.ordered(document);
		if (!provider) {
			return undefined;
		}
		const roots = await provider.prepareTypeHierarchy(document, position, token);
		if (!roots) {
			return undefined;
		}
		TypeHierarchyProviderRegistry.currentModel = new TypeHierarchyModel(roots.reduce((p, c) => p + c.uri, ''), provider, roots);
		return TypeHierarchyProviderRegistry.currentModel;
	}

	async resolveSupertypes(item: TypeHierarchyItem, token: CancellationToken): Promise<TypeHierarchyItem[]> {
		try {
			const result = await this.provider.provideTypeHierarchySupertypes(item, token);
			if (Array.isArray(result) && result.length > 0) {
				return result;
			}
		} catch (e) {
			// ignore
		}
		return [];
	}

	async resolveSubtypes(item: TypeHierarchyItem, token: CancellationToken): Promise<TypeHierarchyItem[]> {
		try {
			const result = await this.provider.provideTypeHierarchySubtypes(item, token);
			if (Array.isArray(result) && result.length > 0) {
				return result;
			}
		} catch (e) {
			// ignore
		}
		return [];
	}
	readonly root: TypeHierarchyItem;

	private constructor(
		readonly id: string,
		readonly provider: TypeHierarchyProvider,
		readonly roots: TypeHierarchyItem[]
	) {
		this.root = roots[0];
	}
}

interface Entry {
	selector: DocumentSelector;
	provider: TypeHierarchyProvider;
	_score: number;
	_time: number;
}

interface TypeHierarchyDto extends TypeHierarchyItem {
	_sessionId: string; // not using
}

declare const process: {typeHierarchyRegistry: TypeHierarchyProviderRegistry};

class TypeHierarchyProviderRegistry {
	private constructor() { }

	private _clock: number = 0;
	private readonly _entries: Entry[] = [];
	private _currentModel: TypeHierarchyModel | undefined = undefined;
	public static get instance() {
		// Problem to support multiple language extensions:
		//   - a single registry should be shared across extensions.
		//   - avoid to register duplicate commands.
		// Workaround:
		//   - use global project process.typeHierarchyRegistry as a singleton. Ideally this registry should be held in vscode-core.
		if (!process.typeHierarchyRegistry) {
			registerCommands();
			process.typeHierarchyRegistry = new this();
		}
		return process.typeHierarchyRegistry;
	}

	public static register(selector: DocumentSelector, provider: TypeHierarchyProvider): void {
		let { _entries, _clock } = this.instance;
		_entries.push({
			selector,
			provider,
			_score: -1,
			_time: _clock++
		});
	}

	public static set currentModel(model: TypeHierarchyModel | undefined) {
		this.instance._currentModel = model;
	}

	public static get currentModel() : TypeHierarchyModel | undefined {
		return this.instance._currentModel;
	}

	public static ordered(document: TextDocument): TypeHierarchyProvider[] {
		const result: TypeHierarchyProvider[] = [];
		this.instance._orderedForEach(document, entry => result.push(entry.provider));
		return result;
	}

	private _orderedForEach(document: TextDocument, callback: (provider: Entry) => any): void {
		if (!document) {
			return;
		}

		this._updateScores(document);

		for (const entry of this._entries) {
			if (entry._score > 0) {
				callback(entry);
			}
		}
	}

	private _lastCandidate: { uri: string; language: string; } | undefined;

	private _updateScores(document: TextDocument): void {

		let candidate = {
			uri: document.uri.toString(),
			language: document.languageId
		};

		if (this._lastCandidate
			&& this._lastCandidate.language === candidate.language
			&& this._lastCandidate.uri === candidate.uri) {

			// nothing has changed
			return;
		}

		this._lastCandidate = candidate;

		for (let entry of this._entries) {
			entry._score = languages.match(entry.selector, document);
		}

		// needs sorting
		this._entries.sort(TypeHierarchyProviderRegistry._compareByScoreAndTime);
	}

	private static _compareByScoreAndTime(a: Entry, b: Entry): number {
		if (a._score < b._score) {
			return 1;
		} else if (a._score > b._score) {
			return -1;
		} else if (a._time < b._time) {
			return 1;
		} else if (a._time > b._time) {
			return -1;
		} else {
			return 0;
		}
	}
}


// --- API command support
const NoneCancellationToken = Object.freeze(
	{
		isCancellationRequested: false,
		onCancellationRequested: () => { return new Disposable(() => { }) }
	}
);

const _models = new Map<string, TypeHierarchyModel>();

function registerCommands() {
	const prepareCommand = 'typeHierarchy.prepare';
	commands.registerCommand(prepareCommand, async (location: Location) => {
		const document = await workspace.openTextDocument(location.uri);
		const model = await TypeHierarchyModel.create(document, location.range.start, NoneCancellationToken);
		if (!model) {
			return [];
		}

		// cache at most 10 models
		_models.set(model.id, model);
		_models.forEach((_value, key, map) => {
			if (map.size > 10) {
				_models.delete(key);
			}
		});

		return [model.root];
	});

	const supertypesCommand = 'typeHierarchy.supertypes';
	commands.registerCommand(supertypesCommand, async (item: TypeHierarchyDto) => {
		const model = TypeHierarchyProviderRegistry.currentModel;
		if (!model) {
			return [];
		}
		return model.resolveSupertypes(item, NoneCancellationToken);
	});

	const subtypesCommand = 'typeHierarchy.subtypes';
	commands.registerCommand(subtypesCommand, async (item: TypeHierarchyDto) => {
		const model = TypeHierarchyProviderRegistry.currentModel;
		if (!model) {
			return [];
		}
		return model.resolveSubtypes(item, NoneCancellationToken);
	});
}
