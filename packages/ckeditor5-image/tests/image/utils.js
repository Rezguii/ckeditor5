/**
 * @license Copyright (c) 2003-2021, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* global console */

import ViewDocumentFragment from '@ckeditor/ckeditor5-engine/src/view/documentfragment';
import ViewDowncastWriter from '@ckeditor/ckeditor5-engine/src/view/downcastwriter';
import ViewDocument from '@ckeditor/ckeditor5-engine/src/view/document';
import ViewPosition from '@ckeditor/ckeditor5-engine/src/view/position';
import ModelElement from '@ckeditor/ckeditor5-engine/src/model/element';
import {
	toImageWidget,
	isImageWidget,
	getSelectedImageWidget,
	isImage,
	isImageInline,
	isImageAllowed,
	insertImage,
	getViewImageFromWidget,
	getImageWidgetAncestor
} from '../../src/image/utils';
import { isWidget, getLabel } from '@ckeditor/ckeditor5-widget/src/utils';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import VirtualTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor';
import { setData as setModelData, getData as getModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';
import ImageBlockEditing from '../../src/image/imageblockediting';
import ImageInlineEditing from '../../src/image/imageinlineediting';
import { StylesProcessor } from '@ckeditor/ckeditor5-engine/src/view/stylesmap';

describe( 'image widget utils', () => {
	let element, image, writer, viewDocument;

	beforeEach( () => {
		viewDocument = new ViewDocument( new StylesProcessor() );
		writer = new ViewDowncastWriter( viewDocument );
		image = writer.createContainerElement( 'img' );
		element = writer.createContainerElement( 'figure' );
		writer.insert( writer.createPositionAt( element, 0 ), image );
		toImageWidget( element, writer, 'image widget' );
	} );

	describe( 'toImageWidget()', () => {
		it( 'should be widgetized', () => {
			expect( isWidget( element ) ).to.be.true;
		} );

		it( 'should set element\'s label', () => {
			expect( getLabel( element ) ).to.equal( 'image widget' );
		} );

		it( 'should set element\'s label combined with alt attribute', () => {
			writer.setAttribute( 'alt', 'foo bar baz', image );
			expect( getLabel( element ) ).to.equal( 'foo bar baz image widget' );
		} );

		it( 'provided label creator should always return same label', () => {
			writer.setAttribute( 'alt', 'foo bar baz', image );

			expect( getLabel( element ) ).to.equal( 'foo bar baz image widget' );
			expect( getLabel( element ) ).to.equal( 'foo bar baz image widget' );
		} );
	} );

	describe( 'isImageWidget()', () => {
		it( 'should return true for elements marked with toImageWidget()', () => {
			expect( isImageWidget( element ) ).to.be.true;
		} );

		it( 'should return false for non-widgetized elements', () => {
			expect( isImageWidget( writer.createContainerElement( 'p' ) ) ).to.be.false;
		} );
	} );

	describe( 'getSelectedImageWidget()', () => {
		let frag;

		it( 'should return true when image widget is the only element in the selection', () => {
			// We need to create a container for the element to be able to create a Range on this element.
			frag = new ViewDocumentFragment( viewDocument, [ element ] );

			const selection = writer.createSelection( element, 'on' );

			expect( getSelectedImageWidget( selection ) ).to.equal( element );
		} );

		it( 'should return false when non-widgetized elements is the only element in the selection', () => {
			const notWidgetizedElement = writer.createContainerElement( 'p' );

			// We need to create a container for the element to be able to create a Range on this element.
			frag = new ViewDocumentFragment( viewDocument, [ notWidgetizedElement ] );

			const selection = writer.createSelection( notWidgetizedElement, 'on' );

			expect( getSelectedImageWidget( selection ) ).to.be.null;
		} );

		it( 'should return false when widget element is not the only element in the selection', () => {
			const notWidgetizedElement = writer.createContainerElement( 'p' );

			frag = new ViewDocumentFragment( viewDocument, [ element, notWidgetizedElement ] );

			const selection = writer.createSelection( writer.createRangeIn( frag ) );

			expect( getSelectedImageWidget( selection ) ).to.be.null;
		} );
	} );

	describe( 'getImageWidgetAncestor()', () => {
		let frag, caption;

		describe( 'selection is inside the caption', () => {
			beforeEach( () => {
				caption = writer.createContainerElement( 'figcaption' );
				writer.insert( writer.createPositionAt( element, 1 ), caption );
				frag = new ViewDocumentFragment( viewDocument, [ element ] );
			} );

			it( 'should return the widget element if selection is not collapsed', () => {
				const text = writer.createText( 'foo' );
				writer.insert( ViewPosition._createAt( caption, 0 ), text );

				const selection = writer.createSelection( writer.createRangeIn( caption ) );

				expect( getImageWidgetAncestor( selection ) ).to.equal( element );
			} );

			it( 'should return the widget element if selection is collapsed', () => {
				const selection = writer.createSelection( caption, 'in' );

				expect( getImageWidgetAncestor( selection ) ).to.equal( element );
			} );
		} );

		it( 'should return null if an image is selected', () => {
			// We need to create a container for the element to be able to create a Range on this element.
			frag = new ViewDocumentFragment( viewDocument, [ element ] );

			const selection = writer.createSelection( element, 'on' );

			expect( getImageWidgetAncestor( selection ) ).to.be.null;
		} );

		it( 'should return null if image is part of the selection', () => {
			const notWidgetizedElement = writer.createContainerElement( 'p' );

			frag = new ViewDocumentFragment( viewDocument, [ element, notWidgetizedElement ] );

			const selection = writer.createSelection( writer.createRangeIn( frag ) );

			expect( getImageWidgetAncestor( selection ) ).to.be.null;
		} );

		it( 'should return null if non-widgetized element is the only element in the selection', () => {
			const notWidgetizedElement = writer.createContainerElement( 'p' );

			// We need to create a container for the element to be able to create a Range on this element.
			frag = new ViewDocumentFragment( viewDocument, [ notWidgetizedElement ] );

			const selection = writer.createSelection( notWidgetizedElement, 'on' );

			expect( getImageWidgetAncestor( selection ) ).to.be.null;
		} );
	} );

	describe( 'isImage()', () => {
		it( 'should return true for image element', () => {
			const image = new ModelElement( 'image' );

			expect( isImage( image ) ).to.be.true;
		} );

		it( 'should return false for different elements', () => {
			const image = new ModelElement( 'foo' );

			expect( isImage( image ) ).to.be.false;
		} );

		it( 'should return false for null and undefined', () => {
			expect( isImage( null ) ).to.be.false;
			expect( isImage( undefined ) ).to.be.false;
		} );
	} );

	describe( 'isInlineImage()', () => {
		it( 'should return true for inline image element', () => {
			const image = new ModelElement( 'imageInline' );

			expect( isImageInline( image ) ).to.be.true;
		} );

		it( 'should return false for different elements', () => {
			const image = new ModelElement( 'foo' );

			expect( isImageInline( image ) ).to.be.false;
		} );

		it( 'should return false for null and undefined', () => {
			expect( isImageInline( null ) ).to.be.false;
			expect( isImageInline( undefined ) ).to.be.false;
		} );
	} );

	describe( 'isImageAllowed()', () => {
		let editor, model;

		beforeEach( () => {
			return VirtualTestEditor
				.create( {
					plugins: [ ImageBlockEditing, ImageInlineEditing, Paragraph ]
				} )
				.then( newEditor => {
					editor = newEditor;
					model = editor.model;

					const schema = model.schema;
					schema.extend( 'image', { allowAttributes: 'uploadId' } );
				} );
		} );

		it( 'should return true when the selection directly in the root', () => {
			model.enqueueChange( 'transparent', () => {
				setModelData( model, '[]' );

				expect( isImageAllowed( editor ) ).to.be.true;
			} );
		} );

		it( 'should return true when the selection is in empty block', () => {
			setModelData( model, '<paragraph>[]</paragraph>' );

			expect( isImageAllowed( editor ) ).to.be.true;
		} );

		it( 'should return true when the selection directly in a paragraph', () => {
			setModelData( model, '<paragraph>foo[]</paragraph>' );
			expect( isImageAllowed( editor ) ).to.be.true;
		} );

		it( 'should return true when the selection directly in a block', () => {
			model.schema.register( 'block', { inheritAllFrom: '$block' } );
			model.schema.extend( '$text', { allowIn: 'block' } );
			editor.conversion.for( 'downcast' ).elementToElement( { model: 'block', view: 'block' } );

			setModelData( model, '<block>foo[]</block>' );
			expect( isImageAllowed( editor ) ).to.be.true;
		} );

		it( 'should return true when the selection is on other image', () => {
			setModelData( model, '[<image></image>]' );
			expect( isImageAllowed( editor ) ).to.be.true;
		} );

		it( 'should return false when the selection is inside other image', () => {
			model.schema.register( 'caption', {
				allowIn: 'image',
				allowContentOf: '$block',
				isLimit: true
			} );
			editor.conversion.for( 'downcast' ).elementToElement( { model: 'caption', view: 'figcaption' } );
			setModelData( model, '<image><caption>[]</caption></image>' );
			expect( isImageAllowed( editor ) ).to.be.false;
		} );

		it( 'should return true when the selection is on other object', () => {
			model.schema.register( 'object', { isObject: true, allowIn: '$root' } );
			editor.conversion.for( 'downcast' ).elementToElement( { model: 'object', view: 'object' } );
			setModelData( model, '[<object></object>]' );

			expect( isImageAllowed( editor ) ).to.be.true;
		} );

		it( 'should be true when the selection is inside isLimit element which allows image', () => {
			model.schema.register( 'table', { allowWhere: '$block', isLimit: true, isObject: true, isBlock: true } );
			model.schema.register( 'tableRow', { allowIn: 'table', isLimit: true } );
			model.schema.register( 'tableCell', { allowIn: 'tableRow', isLimit: true, isSelectable: true } );
			model.schema.extend( '$block', { allowIn: 'tableCell' } );
			editor.conversion.for( 'downcast' ).elementToElement( { model: 'table', view: 'table' } );
			editor.conversion.for( 'downcast' ).elementToElement( { model: 'tableRow', view: 'tableRow' } );
			editor.conversion.for( 'downcast' ).elementToElement( { model: 'tableCell', view: 'tableCell' } );

			setModelData( model, '<table><tableRow><tableCell><paragraph>foo[]</paragraph></tableCell></tableRow></table>' );

			expect( isImageAllowed( editor ) ).to.be.true;
		} );

		it( 'should return false when schema disallows image', () => {
			model.schema.register( 'block', { inheritAllFrom: '$block' } );
			model.schema.extend( 'paragraph', { allowIn: 'block' } );
			// Block image in block.
			model.schema.addChildCheck( ( context, childDefinition ) => {
				if ( childDefinition.name === 'image' && context.last.name === 'block' ) {
					return false;
				}
				if ( childDefinition.name === 'imageInline' && context.last.name === 'paragraph' ) {
					return false;
				}
			} );
			editor.conversion.for( 'downcast' ).elementToElement( { model: 'block', view: 'block' } );

			setModelData( model, '<block><paragraph>[]</paragraph></block>' );

			expect( isImageAllowed( editor ) ).to.be.false;
		} );
	} );

	describe( 'insertImage()', () => {
		let editor, model;

		beforeEach( () => {
			return VirtualTestEditor
				.create( {
					plugins: [ ImageBlockEditing, ImageInlineEditing, Paragraph ]
				} )
				.then( newEditor => {
					editor = newEditor;
					model = editor.model;

					const schema = model.schema;
					schema.extend( 'image', { allowAttributes: 'uploadId' } );
				} );
		} );

		it( 'should insert inline image in a paragraph with text', () => {
			setModelData( model, '<paragraph>f[o]o</paragraph>' );

			insertImage( editor );

			expect( getModelData( model ) ).to.equal( '<paragraph>f[<imageInline></imageInline>]o</paragraph>' );
		} );

		it( 'should insert a block image when the selection is inside an empty paragraph', () => {
			setModelData( model, '<paragraph>[]</paragraph>' );

			insertImage( editor );

			expect( getModelData( model ) ).to.equal( '[<image></image>]' );
		} );

		it( 'should insert a block image in the document root', () => {
			setModelData( model, '[]' );

			insertImage( editor );

			expect( getModelData( model ) ).to.equal( '[<image></image>]' );
		} );

		it( 'should insert image with given attributes', () => {
			setModelData( model, '<paragraph>f[o]o</paragraph>' );

			insertImage( editor, { src: 'bar' } );

			expect( getModelData( model ) ).to.equal( '<paragraph>f[<imageInline src="bar"></imageInline>]o</paragraph>' );
		} );

		it( 'should not insert image nor crash when image could not be inserted', () => {
			model.schema.register( 'other', {
				allowIn: '$root',
				isLimit: true
			} );
			model.schema.extend( '$text', { allowIn: 'other' } );

			editor.conversion.for( 'downcast' ).elementToElement( { model: 'other', view: 'p' } );

			setModelData( model, '<other>[]</other>' );

			insertImage( editor );

			expect( getModelData( model ) ).to.equal( '<other>[]</other>' );
		} );

		it( 'should use the block image type when the config.image.insert.type="block" option is set', async () => {
			const newEditor = await VirtualTestEditor.create( {
				plugins: [ ImageBlockEditing, ImageInlineEditing, Paragraph ],
				image: { insert: { type: 'block' } }
			} );

			setModelData( newEditor.model, '<paragraph>f[o]o</paragraph>' );

			insertImage( newEditor );

			expect( getModelData( newEditor.model ) ).to.equal( '[<image></image>]<paragraph>foo</paragraph>' );

			await newEditor.destroy();
		} );

		it( 'should use the inline image type if the config.image.insert.type="inline" option is set', async () => {
			const newEditor = await VirtualTestEditor.create( {
				plugins: [ ImageBlockEditing, ImageInlineEditing, Paragraph ],
				image: { insert: { type: 'inline' } }
			} );

			setModelData( newEditor.model, '<paragraph>f[o]o</paragraph>' );

			insertImage( newEditor );

			expect( getModelData( newEditor.model ) ).to.equal( '<paragraph>f[<imageInline></imageInline>]o</paragraph>' );

			await newEditor.destroy();
		} );

		it( 'should use the inline image type when there is only ImageInlineEditing plugin enabled', async () => {
			const newEditor = await VirtualTestEditor.create( {
				plugins: [ ImageInlineEditing, Paragraph ]
			} );

			setModelData( newEditor.model, '<paragraph>f[o]o</paragraph>' );

			insertImage( newEditor );

			expect( getModelData( newEditor.model ) ).to.equal( '<paragraph>f[<imageInline></imageInline>]o</paragraph>' );

			await newEditor.destroy();
		} );

		it( 'should use block the image type when there is only ImageBlockEditing plugin enabled', async () => {
			const newEditor = await VirtualTestEditor.create( {
				plugins: [ ImageBlockEditing, Paragraph ]
			} );

			setModelData( newEditor.model, '<paragraph>f[o]o</paragraph>' );

			insertImage( newEditor );

			expect( getModelData( newEditor.model ) ).to.equal( '[<image></image>]<paragraph>foo</paragraph>' );

			await newEditor.destroy();
		} );

		it( 'should use the block image type when the config.image.insert.type="inline" option is set ' +
			'but ImageInlineEditing plugin is not enabled', async () => {
			const consoleWarnStub = sinon.stub( console, 'warn' );
			const newEditor = await VirtualTestEditor.create( {
				plugins: [ ImageBlockEditing, Paragraph ],
				image: { insert: { type: 'inline' } }
			} );

			setModelData( newEditor.model, '<paragraph>f[o]o</paragraph>' );

			insertImage( newEditor );

			expect( consoleWarnStub.calledOnce ).to.equal( true );
			expect( consoleWarnStub.firstCall.args[ 0 ] ).to.equal( 'image-inline-plugin-required' );
			expect( getModelData( newEditor.model ) ).to.equal( '[<image></image>]<paragraph>foo</paragraph>' );

			await newEditor.destroy();
			console.warn.restore();
		} );

		it( 'should use the inline image type when the image.insert.type="block" option is set ' +
			'but ImageBlockEditing plugin is not enabled', async () => {
			const consoleWarnStub = sinon.stub( console, 'warn' );
			const newEditor = await VirtualTestEditor.create( {
				plugins: [ ImageInlineEditing, Paragraph ],
				image: { insert: { type: 'block' } }
			} );

			setModelData( newEditor.model, '<paragraph>f[o]o</paragraph>' );

			insertImage( newEditor );

			expect( consoleWarnStub.calledOnce ).to.equal( true );
			expect( consoleWarnStub.firstCall.args[ 0 ] ).to.equal( 'image-block-plugin-required' );
			expect( getModelData( newEditor.model ) ).to.equal( '<paragraph>f[<imageInline></imageInline>]o</paragraph>' );

			await newEditor.destroy();
			console.warn.restore();
		} );
	} );

	describe( 'getViewImageFromWidget()', () => {
		// figure
		//   img
		it( 'returns the the img element from widget if the img is the first children', () => {
			expect( getViewImageFromWidget( element ) ).to.equal( image );
		} );

		// figure
		//   div
		//   img
		it( 'returns the the img element from widget if the img is not the first children', () => {
			writer.insert( writer.createPositionAt( element, 0 ), writer.createContainerElement( 'div' ) );
			expect( getViewImageFromWidget( element ) ).to.equal( image );
		} );

		// figure
		//   div
		//     img
		it( 'returns the the img element from widget if the img is a child of another element', () => {
			const divElement = writer.createContainerElement( 'div' );

			writer.insert( writer.createPositionAt( element, 0 ), divElement );
			writer.move( writer.createRangeOn( image ), writer.createPositionAt( divElement, 0 ) );

			expect( getViewImageFromWidget( element ) ).to.equal( image );
		} );

		// figure
		//   div
		//     "Bar"
		//     img
		//   "Foo"
		it( 'does not throw an error if text node found', () => {
			const divElement = writer.createContainerElement( 'div' );

			writer.insert( writer.createPositionAt( element, 0 ), divElement );
			writer.insert( writer.createPositionAt( element, 0 ), writer.createText( 'Foo' ) );
			writer.insert( writer.createPositionAt( divElement, 0 ), writer.createText( 'Bar' ) );
			writer.move( writer.createRangeOn( image ), writer.createPositionAt( divElement, 1 ) );

			expect( getViewImageFromWidget( element ) ).to.equal( image );
		} );
	} );
} );
