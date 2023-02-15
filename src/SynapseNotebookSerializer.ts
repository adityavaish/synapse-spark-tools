/* eslint-disable @typescript-eslint/naming-convention */
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { SynCellMetadata, SynMetadata, SynNotebook, SynNotebookCell } from './SynapseNotebookTypes';

export class SynapseNotebookSerializer implements vscode.NotebookSerializer {
	private synapseNotebook?: SynNotebook;

	private toNotebookCellKind(cellType: string): vscode.NotebookCellKind {
		switch (cellType) {
			case "code": return vscode.NotebookCellKind.Code;
			case "markdown": return vscode.NotebookCellKind.Markup;
			default: return vscode.NotebookCellKind.Markup;
		}
	}

	private fromNotebookCellKind(cellKind: vscode.NotebookCellKind): string {
		switch (cellKind) {
			case vscode.NotebookCellKind.Code: return "code";
			case vscode.NotebookCellKind.Markup: return "markdown";
			default: return "markdown";
		}
	}

	private toSynapseNotebookCell(cell: vscode.NotebookCellData): SynNotebookCell {
		return {
			cell_type: this.fromNotebookCellKind(cell.kind),
			source: cell.value.split("\n").map(x => x.replace("\r", "\r\n")),
			metadata: <SynCellMetadata> cell.metadata,
			execution_count: 0,
		};
	}

	private toNotebookCellData(cell: SynNotebookCell): vscode.NotebookCellData {
        let lang = this.synapseNotebook?.properties.metadata.language_info.name || "spark";

		return {
			kind: this.toNotebookCellKind(cell.cell_type),
			value: cell.source.join(""),
			languageId: lang,
			metadata: cell.metadata
		};
	}

	serializeNotebook(data: vscode.NotebookData, token: vscode.CancellationToken): Uint8Array | Thenable<Uint8Array> {
		let notebookData: SynNotebook = <SynNotebook> data.metadata;
		notebookData.properties.cells = data.cells.map(x => this.toSynapseNotebookCell(x));

		return new TextEncoder().encode(JSON.stringify(notebookData, null, 4));
	}

	deserializeNotebook(content: Uint8Array, _token: vscode.CancellationToken): vscode.NotebookData {
		var contents = new TextDecoder().decode(content);

		try {
			this.synapseNotebook = <SynNotebook>JSON.parse(contents);

			const cells = this.synapseNotebook.properties.cells.map(x => this.toNotebookCellData(x));
	
			const notebookData = new vscode.NotebookData(cells);
			notebookData.metadata = this.synapseNotebook;
			
			return notebookData;
		}
		catch {
			throw new Error("Not a valid synapse notebook");
		}
	}
}