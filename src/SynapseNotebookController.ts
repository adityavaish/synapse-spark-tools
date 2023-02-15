import * as vscode from 'vscode';
import { submitCodeCell } from './SynapseNotebookExecutor';
import { SynapseNotebookExecutorResponse, SynNotebook } from './SynapseNotebookTypes';

export class SynapseNotebookController {
    readonly controllerId = 'synapse-notebook-controller-id';
    readonly notebookType = 'synapse-notebook';
    readonly label = 'Synapse kernel';
    readonly supportedLanguages = ['python', 'scala', 'spark'];

    private readonly controller: vscode.NotebookController;
    private _executionOrder = 0;

    constructor() {
        this.controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );

        this.controller.supportedLanguages = this.supportedLanguages;
        this.controller.supportsExecutionOrder = true;
        this.controller.executeHandler = this.execute.bind(this);
    }

    private async execute(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): Promise<void> {
        for (let cell of cells) {
            await this.executeCell(cell);
        }
    }

    private async executeCell(cell: vscode.NotebookCell): Promise<void> {
        const execution = this.controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now());

        try {
            const sparkStatementOutput = await submitCodeCell(cell, execution);

            const outputs: vscode.NotebookCellOutputItem[] = [];
            for (let key in sparkStatementOutput.data) {
                outputs.push(
                    vscode.NotebookCellOutputItem.text(<string>sparkStatementOutput.data[key], key));
            }

            execution.replaceOutput(
                new vscode.NotebookCellOutput(outputs)
            );
        }
        catch {
            execution.replaceOutput(new vscode.NotebookCellOutput([vscode.NotebookCellOutputItem.stdout('unknown')]));
        }
    }

    dispose(): void { }
}