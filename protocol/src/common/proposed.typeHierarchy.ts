/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox, Microsoft and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { DocumentUri, Range, SymbolKind, SymbolTag } from 'vscode-languageserver-types';

import { ProtocolRequestType } from './messages';
import {
	TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams, PartialResultParams,
	WorkDoneProgressParams, WorkDoneProgressOptions
} from './protocol';

/**
 * @since 3.17.0
 */
export interface TypeHierarchyClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}

/**
 * Type hierarchy options used during static registration.
 *
 * @since 3.17.0
 */
export interface TypeHierarchyOptions extends WorkDoneProgressOptions {
}

/**
 * Type hierarchy options used during static or dynamic registration.
 *
 * @since 3.17.0
 */
export interface TypeHierarchyRegistrationOptions extends TextDocumentRegistrationOptions, TypeHierarchyOptions, StaticRegistrationOptions {
}

/**
 * The parameter of a `textDocument/prepareTypeHierarchy` request.
 *
 * @since 3.17.0
 */
export interface TypeHierarchyPrepareParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}

/**
 * A request to result a `TypeHierarchyItem` in a document at a given position.
 * Can be used as an input to a subtypes or supertypes type hierarchy.
 *
 * @since 3.17.0
 */
export namespace TypeHierarchyPrepareRequest {
	export const method: 'textDocument/prepareTypeHierarchy' = 'textDocument/prepareTypeHierarchy';
	export const type = new ProtocolRequestType<TypeHierarchyPrepareParams, TypeHierarchyItem[] | null, never, void, TypeHierarchyRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<TypeHierarchyPrepareParams, TypeHierarchyItem[] | null, void>;
}

/**
 * The parameter of a `typeHierarchy/supertypes` request.
 *
 * @since 3.17.0
 */
export interface TypeHierarchySupertypesParams extends WorkDoneProgressParams, PartialResultParams {
	item: TypeHierarchyItem;
}

/**
 * A request to resolve the supertypes for a given `TypeHierarchyItem`.
 *
 * @since 3.17.0
 */
export namespace TypeHierarchySupertypesRequest {
	export const method: 'typeHierarchy/supertypes' = 'typeHierarchy/supertypes';
	export const type = new ProtocolRequestType<TypeHierarchySupertypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void, void>(method);
	export type HandlerSignature = RequestHandler<TypeHierarchySupertypesParams, TypeHierarchyItem[] | null, void>;
}

/**
 * The parameter of a `typeHierarchy/subtypes` request.
 *
 * @since 3.17.0
 */
export interface TypeHierarchySubtypesParams extends WorkDoneProgressParams, PartialResultParams {
	item: TypeHierarchyItem;
}

/**
 * A request to resolve the subtypes for a given `TypeHierarchyItem`.
 *
 * @since 3.17.0
 */
export namespace TypeHierarchySubtypesRequest {
	export const method: 'typeHierarchy/subtypes' = 'typeHierarchy/subtypes';
	export const type = new ProtocolRequestType<TypeHierarchySubtypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void, void>(method);
	export type HandlerSignature = RequestHandler<TypeHierarchySubtypesParams, TypeHierarchyItem[] | null, void>;
}

// --- types

/**
 * @since 3.17.0
 */
 export interface TypeHierarchyItem {
	/**
	 * The name of this item.
	 */
	name: string;
	/**
	 * The kind of this item.
	 */
	kind: SymbolKind;
	/**
	 * Tags for this item.
	 */
	tags?: SymbolTag[];
	/**
	 * More detail for this item, e.g. the signature of a function.
	 */
	detail?: string;
	/**
	 * The resource identifier of this item.
	 */
	uri: DocumentUri;
	/**
	 * The range enclosing this symbol not including leading/trailing whitespace
	 * but everything else, e.g. comments and code.
	 */
	range: Range;
	/**
	 * The range that should be selected and revealed when this symbol is being
	 * picked, e.g. the name of a function. Must be contained by the
	 * [`range`](#TypeHierarchyItem.range).
	 */
	selectionRange: Range;
	/**
	 * A data entry field that is preserved between a type hierarchy prepare and
	 * supertypes or subtypes requests. It could also be used to identify the
	 * type hierarchy in the server, helping improve the performance on
	 * resolving supertypes and subtypes.
	 */
	data?: unknown;
}