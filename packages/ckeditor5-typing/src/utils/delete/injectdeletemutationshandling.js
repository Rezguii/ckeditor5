/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module typing/utils/delete/injectbeforeinputhandling
 */

import env from '@ckeditor/ckeditor5-utils/src/env';
import DeleteObserver from '../../deleteobserver';

/**
 * TODO
 *
 * @param {module:core/editor/editor~Editor} editor The editor instance.
 */
export default function injectDeleteMutationsHandling( editor ) {
	const view = editor.editing.view;
	const viewDocument = view.document;

	view.addObserver( DeleteObserver );

	viewDocument.on( 'delete', ( evt, data ) => {
		const deleteCommandParams = { unit: data.unit, sequence: data.sequence };

		// If a specific (view) selection to remove was set, convert it to a model selection and set as a parameter for `DeleteCommand`.
		if ( data.selectionToRemove ) {
			const modelSelection = editor.model.createSelection();
			const ranges = [];

			for ( const viewRange of data.selectionToRemove.getRanges() ) {
				ranges.push( editor.editing.mapper.toModelRange( viewRange ) );
			}

			modelSelection.setTo( ranges );

			deleteCommandParams.selection = modelSelection;
		}

		editor.execute( data.direction == 'forward' ? 'forwardDelete' : 'delete', deleteCommandParams );

		data.preventDefault();

		view.scrollToTheSelection();
	} );

	// Android IMEs have a quirk - they change DOM selection after the input changes were performed by the browser.
	// This happens on `keyup` event. Android doesn't know anything about our deletion and selection handling. Even if the selection
	// was changed during input events, IME remembers the position where the selection "should" be placed and moves it there.
	//
	// To prevent incorrect selection, we save the selection after deleting here and then re-set it on `keyup`. This has to be done
	// on DOM selection level, because on `keyup` the model selection is still the same as it was just after deletion, so it
	// wouldn't be changed and the fix would do nothing.
	//
	if ( env.isAndroid ) {
		let domSelectionAfterDeletion = null;

		viewDocument.on( 'delete', ( evt, data ) => {
			const domSelection = data.domTarget.ownerDocument.defaultView.getSelection();

			domSelectionAfterDeletion = {
				anchorNode: domSelection.anchorNode,
				anchorOffset: domSelection.anchorOffset,
				focusNode: domSelection.focusNode,
				focusOffset: domSelection.focusOffset
			};
		}, { priority: 'lowest' } );

		viewDocument.on( 'keyup', ( evt, data ) => {
			if ( domSelectionAfterDeletion ) {
				const domSelection = data.domTarget.ownerDocument.defaultView.getSelection();

				domSelection.collapse( domSelectionAfterDeletion.anchorNode, domSelectionAfterDeletion.anchorOffset );
				domSelection.extend( domSelectionAfterDeletion.focusNode, domSelectionAfterDeletion.focusOffset );

				domSelectionAfterDeletion = null;
			}
		} );
	}
}